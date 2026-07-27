import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Bill } from '../models/Bill.js';
import { Order } from '../models/Order.js';
import { Table } from '../models/Table.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { io } from '../server.js';

const TAX_RATE = 0.05; // 5% GST
const SERVICE_CHARGE_RATE = 0.05; // 5% Service Charge

const router = Router();

/**
 * GET /api/bills
 * Fetch billing history for staff/admin.
 */
router.get('/', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    let bills = await Bill.find(filter).sort({ createdAt: -1 }).populate('orderIds');

    // Auto-sync any orders not yet linked to an explicit Bill model
    const billedOrderIds = new Set(
      bills.flatMap((b: any) => (b.orderIds || []).map((o: any) => (o._id ? o._id.toString() : o.toString())))
    );

    const unbilledOrders = await Order.find({ _id: { $nin: Array.from(billedOrderIds) } });

    if (unbilledOrders.length > 0) {
      const { MenuItem } = await import('../models/MenuItem.js');
      const allMenuItems = await MenuItem.find();
      const priceMap = new Map(allMenuItems.map((m) => [m._id.toString(), m.price]));

      for (const unbilledOrder of unbilledOrders) {
        let subtotal = 0;
        for (const item of unbilledOrder.items || []) {
          const unitPrice = priceMap.get(item.menuItemId?.toString()) || 200;
          subtotal += unitPrice * item.qty;
        }
        const tax = Math.round(subtotal * TAX_RATE);
        const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
        const total = subtotal + tax + serviceCharge;

        await Bill.create({
          orderIds: [unbilledOrder._id],
          total,
          tax,
          status: unbilledOrder.status === 'billed' ? 'paid' : 'unpaid',
        });
      }
      bills = await Bill.find(filter).sort({ createdAt: -1 }).populate('orderIds');
    }

    const { MenuItem } = await import('../models/MenuItem.js');
    const allMenuItems = await MenuItem.find();
    const menuMap = new Map(allMenuItems.map((m) => [m._id.toString(), m.price]));

    const billHistory = bills.map((b: any) => {
      const orders = b.orderIds || [];
      const itemMap = new Map<string, { name: string; qty: number; price: number }>();
      let subtotal = 0;
      let tableId: number | undefined = undefined;
      let pickupCode: string | undefined = undefined;
      let orderType = 'dine-in';

      for (const order of orders) {
        if (order.tableId) tableId = order.tableId;
        if (order.pickupCode) pickupCode = order.pickupCode;
        if (order.orderType) orderType = order.orderType;

        for (const item of order.items || []) {
          const unitPrice = menuMap.get(item.menuItemId?.toString()) || 200;
          const key = item.name;
          const existing = itemMap.get(key);
          if (existing) {
            existing.qty += item.qty;
          } else {
            itemMap.set(key, { name: item.name, qty: item.qty, price: unitPrice });
          }
          subtotal += unitPrice * item.qty;
        }
      }

      const itemizedList = Array.from(itemMap.values()).map((it) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
        total: it.price * it.qty,
      }));

      const tax = b.tax || Math.round(subtotal * TAX_RATE);
      const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
      const total = b.total || subtotal + tax + serviceCharge;

      return {
        _id: b._id.toString(),
        billId: b._id.toString(),
        invoiceNumber: `INV-${tableId ? `T${tableId}` : b._id.toString().slice(-4).toUpperCase()}`,
        tableId,
        pickupCode,
        orderType,
        subtotal: subtotal || Math.round(total * 0.9),
        tax,
        serviceCharge,
        total,
        status: b.status,
        method: b.method || 'card',
        itemizedList,
        isComplete: true,
        isPaid: b.status === 'paid',
        createdAt: b.createdAt,
      };
    });

    res.json(billHistory);
  } catch (error) {
    console.error('Error fetching bill history:', error);
    res.status(500).json({ error: 'Failed to fetch bill history' });
  }
});

/**
 * GET /api/bills/table/:tableId
 * Fetch itemized invoice / bill for a table.
 */
router.get('/table/:tableId', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const tableId = Number(req.params.tableId);
    const table = await Table.findOne({ number: tableId });

    let query: any = { tableId };
    if (table && table.currentSessionId) {
      query.sessionId = table.currentSessionId;
      query.status = { $in: ['new', 'firing', 'ready', 'served', 'billed'] };
    } else {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      query.status = { $in: ['new', 'firing', 'ready', 'served'] };
      query.createdAt = { $gte: twelveHoursAgo };
    }

    const orders = await Order.find(query);

    if (orders.length === 0) {
      res.status(404).json({ error: 'No active orders found for Table ' + tableId });
      return;
    }

    const itemMap = new Map<string, { name: string; qty: number; price: number }>();
    let subtotal = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const { MenuItem } = await import('../models/MenuItem.js');
        const menuItem = await MenuItem.findById(item.menuItemId);
        const unitPrice = menuItem ? menuItem.price : 200;

        const key = item.name;
        const existing = itemMap.get(key);
        if (existing) {
          existing.qty += item.qty;
        } else {
          itemMap.set(key, { name: item.name, qty: item.qty, price: unitPrice });
        }
        subtotal += unitPrice * item.qty;
      }
    }

    const isComplete = orders.every((o) => o.status === 'served' || o.status === 'billed');

    const existingBill = await Bill.findOne({
      orderIds: { $in: orders.map((o) => o._id) },
    });
    const isPaid = existingBill ? existingBill.status === 'paid' : false;

    const itemizedList = Array.from(itemMap.values()).map((it) => ({
      name: it.name,
      qty: it.qty,
      price: it.price,
      total: it.price * it.qty,
    }));

    const tax = Math.round(subtotal * TAX_RATE);
    const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
    const total = subtotal + tax + serviceCharge;

    const invoiceNumber = `INV-${tableId}-${Date.now().toString().slice(-4)}`;

    res.json({
      invoiceNumber,
      billId: existingBill ? existingBill._id.toString() : undefined,
      tableId,
      subtotal,
      tax,
      serviceCharge,
      total,
      itemizedList,
      ordersCount: orders.length,
      isComplete,
      isPaid,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error fetching table bill:', error);
    res.status(500).json({ error: 'Failed to fetch table bill' });
  }
});

/**
 * POST /api/bills
 * Generate a bill from order IDs or tableId.
 */
router.post('/', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIds, tableId } = req.body;

    let query: any = {};
    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      query = { _id: { $in: orderIds } };
    } else if (tableId) {
      query = { tableId: Number(tableId) };
    } else {
      res.status(400).json({ error: 'orderIds[] or tableId is required' });
      return;
    }

    const orders = await Order.find(query);

    if (orders.length === 0) {
      res.status(404).json({ error: 'No orders found to bill' });
      return;
    }

    let subtotal = 0;
    const itemMap = new Map<string, { name: string; qty: number; price: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        const { MenuItem } = await import('../models/MenuItem.js');
        const menuItem = await MenuItem.findById(item.menuItemId);
        const unitPrice = menuItem ? menuItem.price : 200;

        const key = item.name;
        const existing = itemMap.get(key);
        if (existing) {
          existing.qty += item.qty;
        } else {
          itemMap.set(key, { name: item.name, qty: item.qty, price: unitPrice });
        }
        subtotal += unitPrice * item.qty;
      }
    }

    const tax = Math.round(subtotal * TAX_RATE);
    const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
    const total = subtotal + tax + serviceCharge;

    const bill = await Bill.create({
      orderIds: orders.map((o) => o._id),
      total,
      tax,
      status: 'unpaid',
    });

    await Order.updateMany({ _id: { $in: orders.map((o) => o._id) } }, { status: 'billed' });

    if (tableId) {
      await Table.findOneAndUpdate({ number: Number(tableId) }, { status: 'billing' });
      const updatedTables = await Table.find().sort({ number: 1 });
      const mapped = updatedTables.map((t) => ({
        id: t.number,
        capacity: t.capacity,
        status: t.status,
      }));
      io.emit('tables:updated', mapped);
    }

    io.emit('bill:updated', bill);

    const itemizedList = Array.from(itemMap.values()).map((it) => ({
      name: it.name,
      qty: it.qty,
      price: it.price,
      total: it.price * it.qty,
    }));

    res.status(201).json({
      bill,
      invoiceNumber: `INV-${bill._id.toString().slice(-4).toUpperCase()}`,
      subtotal,
      tax,
      serviceCharge,
      total,
      itemizedList,
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

/**
 * PATCH /api/bills/:id/pay
 * Mark a bill as paid and free up the table.
 */
router.patch('/:id/pay', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { method, tableId } = req.body;

    let bill = null;
    const idParam = req.params.id;
    const billId = Array.isArray(idParam) ? idParam[0] : idParam;

    if (billId && mongoose.Types.ObjectId.isValid(billId)) {
      bill = await Bill.findById(billId);
    }

    if (!bill && tableId) {
      const activeOrders = await Order.find({ tableId: Number(tableId) });
      if (activeOrders.length > 0) {
        bill = await Bill.findOne({ orderIds: { $in: activeOrders.map((o) => o._id) } });
        if (!bill) {
          const { MenuItem } = await import('../models/MenuItem.js');
          const allMenuItems = await MenuItem.find();
          const priceMap = new Map(allMenuItems.map((m) => [m._id.toString(), m.price]));

          let subtotal = 0;
          for (const o of activeOrders) {
            for (const item of o.items) {
              const unitPrice = priceMap.get(item.menuItemId?.toString()) || 200;
              subtotal += unitPrice * item.qty;
            }
          }
          const tax = Math.round(subtotal * TAX_RATE);
          const total = subtotal + tax + Math.round(subtotal * SERVICE_CHARGE_RATE);
          bill = await Bill.create({
            orderIds: activeOrders.map((o) => o._id),
            total,
            tax,
            status: 'unpaid',
          });
        }
      }
    }

    if (bill) {
      bill.status = 'paid';
      bill.method = method || 'card';
      await bill.save();
      await Order.updateMany({ _id: { $in: bill.orderIds } }, { status: 'billed' });
    }

    // Free up table & close dining session
    const targetTableNumber = tableId ? Number(tableId) : undefined;
    if (targetTableNumber) {
      await Table.findOneAndUpdate(
        { number: targetTableNumber },
        { $set: { status: 'free' }, $unset: { currentSessionId: 1 } }
      );
    } else if (bill && bill.orderIds?.length > 0) {
      const orders = await Order.find({ _id: { $in: bill.orderIds } });
      for (const o of orders) {
        if (o.tableId) {
          await Table.findOneAndUpdate(
            { number: o.tableId },
            { $set: { status: 'free' }, $unset: { currentSessionId: 1 } }
          );
        }
      }
    }

    // Broadcast table updates and bill payment events
    const updatedTables = await Table.find().sort({ number: 1 });
    const mapped = updatedTables.map((t) => ({
      id: t.number,
      capacity: t.capacity,
      status: t.status,
    }));
    io.emit('tables:updated', mapped);
    io.emit('bill:paid', { tableId: targetTableNumber, billId: bill?._id?.toString() || billId, status: 'paid', method: method || 'card' });
    io.emit('bill:updated', bill);

    res.json({ success: true, message: 'Payment completed & table released', bill });
  } catch (error) {
    console.error('Error paying bill:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

/**
 * DELETE /api/bills/clear
 * Clear all bills except top 2, or clear old bill/order records.
 */
router.delete('/clear', verifyToken, requireRole('staff', 'admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const allBills = await Bill.find().sort({ createdAt: -1 });

    if (allBills.length > 2) {
      const billsToKeep = allBills.slice(0, 2);
      const billsToDelete = allBills.slice(2);
      const idsToDelete = billsToDelete.map((b) => b._id);
      await Bill.deleteMany({ _id: { $in: idsToDelete } });

      const keptOrderIds = billsToKeep.flatMap((b: any) => b.orderIds || []);
      await Order.deleteMany({ _id: { $nin: keptOrderIds } });
    }

    const remainingBills = await Bill.find().populate('orderIds');
    io.emit('bill:updated', null);
    res.json({ message: 'Billing history trimmed to 2 bills', count: remainingBills.length });
  } catch (error) {
    console.error('Error clearing bills:', error);
    res.status(500).json({ error: 'Failed to clear bills' });
  }
});

export default router;
