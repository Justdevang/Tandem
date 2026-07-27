import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { Table } from '../models/Table.js';
import { Bill } from '../models/Bill.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { io } from '../server.js';
import { recalculateKitchenLoad } from '../services/kitchenLoad.js';

const router = Router();

/**
 * Helper: format an Order document into the Ticket shape that
 * TicketRail.tsx expects
 */
function orderToTicket(order: any) {
  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const now = new Date();
  const elapsedMin = Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / 60000));
  const firedAt = createdAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const orderIdStr = order._id ? order._id.toString() : '';
  const shortId = orderIdStr ? orderIdStr.slice(-4).toUpperCase() : '0000';
  const orderType = order.orderType || 'dine-in';
  const pickupCode = order.pickupCode || '';
  const estimatedReadyAt = order.estimatedReadyAt || new Date(Date.now() + 15 * 60000);
  const etaMinutes = order.etaMinutes || 15;

  return {
    id: `T-${shortId}`,
    _id: orderIdStr,
    orderType,
    pickupCode,
    table: orderType === 'dine-in' ? order.tableId : undefined,
    displayLabel: orderType === 'takeaway' ? `TAKEAWAY · #${pickupCode}` : `Table ${order.tableId}`,
    status: order.status || 'new',
    estimatedReadyAt,
    etaMinutes,
    items: Array.isArray(order.items)
      ? order.items.map((it: any) => ({
          name: it.name,
          qty: it.qty,
          notes: it.notes || undefined,
        }))
      : [],
    firedAt,
    elapsedMin,
  };
}

/**
 * POST /api/orders
 * ═══════════════════════════════════════════════════════════
 * THE CORE REAL-TIME CHAIN with Takeaway & Queue-Aware Prep-Time ETA
 * ═══════════════════════════════════════════════════════════
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId, items, orderType: rawOrderType } = req.body;
    const orderType: 'dine-in' | 'takeaway' = rawOrderType === 'takeaway' ? 'takeaway' : 'dine-in';

    if (orderType === 'dine-in' && !tableId) {
      res.status(400).json({ error: 'tableId is required for dine-in orders' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items[] array is required' });
      return;
    }

    // Consolidated line items
    const consolidatedMap = new Map<string, { menuItemId: string; qty: number; notes?: string }>();
    for (const item of items) {
      if (!item.menuItemId || !item.qty || item.qty <= 0) continue;
      const key = String(item.menuItemId);
      const existing = consolidatedMap.get(key);
      if (existing) {
        existing.qty += item.qty;
      } else {
        consolidatedMap.set(key, { menuItemId: key, qty: item.qty, notes: item.notes });
      }
    }

    const consolidatedItems = Array.from(consolidatedMap.values());
    if (consolidatedItems.length === 0) {
      res.status(400).json({ error: 'No valid order items provided' });
      return;
    }

    // Resolve menu items, check stock & track prep times
    const orderItems = [];
    let maxPrepMinutes = 5;

    for (const item of consolidatedItems) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        res.status(400).json({ error: `Menu item not found: ${item.menuItemId}` });
        return;
      }
      if (menuItem.stockQty < item.qty) {
        res.status(400).json({
          error: `Insufficient stock for ${menuItem.name}: only ${menuItem.stockQty} available.`,
        });
        return;
      }

      const prepTime = menuItem.avgPrepMinutes || (menuItem.category === 'Mains' ? 15 : menuItem.category === 'Starters' ? 10 : 5);
      if (prepTime > maxPrepMinutes) {
        maxPrepMinutes = prepTime;
      }

      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        qty: item.qty,
        notes: item.notes,
      });
    }

    // Compute Queue-Aware Prep-Time ETA
    const activeTicketCount = await Order.countDocuments({ status: { $in: ['new', 'firing'] } });
    const queueDelayMinutes = activeTicketCount * 2; // 2 min per ticket ahead in queue
    const totalEtaMinutes = maxPrepMinutes + queueDelayMinutes;
    const estimatedReadyAt = new Date(Date.now() + totalEtaMinutes * 60000);

    // Generate 4-digit pickup code for takeaway orders
    let pickupCode: string | undefined = undefined;
    if (orderType === 'takeaway') {
      pickupCode = String(Math.floor(1000 + Math.random() * 9000));
    }

    // 0. Resolve or create active session ID for table/order
    let sessionId: string | undefined = req.body.sessionId;

    if (orderType === 'dine-in' && tableId) {
      let table = await Table.findOne({ number: Number(tableId) });
      if (!table) {
        table = await Table.create({ number: Number(tableId), capacity: 4, status: 'free' });
      }

      if (!table.currentSessionId || table.status === 'free') {
        sessionId = `sess_${Date.now()}_t${tableId}`;
        table.currentSessionId = sessionId;
        table.status = 'occupied';
        await table.save();
      } else {
        sessionId = table.currentSessionId;
        if (table.status !== 'occupied') {
          table.status = 'occupied';
          await table.save();
        }
      }
    } else {
      sessionId = `sess_${Date.now()}_takeaway_${pickupCode || Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 1. Create Order
    const order = await Order.create({
      orderType,
      tableId: orderType === 'dine-in' ? Number(tableId) : undefined,
      pickupCode,
      sessionId,
      items: orderItems,
      status: 'new',
      estimatedReadyAt,
      etaMinutes: totalEtaMinutes,
    });

    // 2. Decrement stock & record InventoryLog
    for (const item of orderItems) {
      await InventoryLog.create({
        menuItemId: item.menuItemId,
        changeQty: -item.qty,
        reason: 'order',
      });

      const updatedMenuItem = await MenuItem.findByIdAndUpdate(
        item.menuItemId,
        { $inc: { stockQty: -item.qty } },
        { new: true }
      );

      if (updatedMenuItem && updatedMenuItem.stockQty < 0) {
        updatedMenuItem.stockQty = 0;
        await updatedMenuItem.save();
      }
    }

    // 3. Auto-create Bill document
    let orderSubtotal = 0;
    for (const item of orderItems) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      const unitPrice = menuItem ? menuItem.price : 200;
      orderSubtotal += unitPrice * item.qty;
    }
    const orderTax = Math.round(orderSubtotal * 0.05);
    const orderTotal = orderSubtotal + orderTax + Math.round(orderSubtotal * 0.05);

    const createdBill = await Bill.create({
      orderIds: [order._id],
      total: orderTotal,
      tax: orderTax,
      status: 'unpaid',
      sessionId,
    });

    // 4. Broadcast updated menu & inventory to all clients
    const updatedMenu = await MenuItem.find().sort({ category: 1, name: 1 });
    io.emit('menu:updated', updatedMenu);

    const updatedInventory = await MenuItem.find().sort({ stockQty: 1 });
    io.emit('inventory:updated', updatedInventory);

    // 5. Broadcast ticket & bill updates
    const ticket = orderToTicket(order);
    io.emit('ticket:new', ticket);
    io.emit('bill:updated', createdBill);

    // 6. Broadcast updated tables floor & recalculate kitchen load
    const updatedTables = await Table.find().sort({ number: 1 });
    const mappedTables = updatedTables.map((t) => ({
      id: t.number,
      capacity: t.capacity,
      status: t.status,
    }));
    io.emit('tables:updated', mappedTables);
    await recalculateKitchenLoad();

    res.status(201).json({ order, ticket, etaMinutes: totalEtaMinutes, estimatedReadyAt, pickupCode });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * GET /api/orders?status=new,firing,ready
 */
router.get('/', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const statusFilter = req.query.status
      ? (req.query.status as string).split(',')
      : ['new', 'firing', 'ready'];

    const orders = await Order.find({ status: { $in: statusFilter } }).sort({ createdAt: -1 });
    const tickets = orders.map(orderToTicket);
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Advance ticket status (new -> firing -> ready -> served -> billed)
 */
router.patch('/:id/status', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');

    const validStatuses = ['new', 'firing', 'ready', 'served', 'billed'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    let order = null;

    if (mongoose.Types.ObjectId.isValid(targetId)) {
      order = await Order.findById(targetId);
    }

    if (!order) {
      const activeOrders = await Order.find({ status: { $in: ['new', 'firing', 'ready', 'served'] } });
      order = activeOrders.find(
        (o) =>
          orderToTicket(o).id.toUpperCase() === targetId.toUpperCase() ||
          o._id.toString() === targetId
      );
    }

    if (!order) {
      res.status(404).json({ error: `Order not found with ID: ${targetId}` });
      return;
    }

    order.status = status;

    // Track order fulfillment completion time (in minutes)
    if (['ready', 'served', 'billed'].includes(status) && !order.completedAt) {
      const completedAt = new Date();
      const createdAt = order.createdAt ? new Date(order.createdAt) : completedAt;
      const fulfillmentMinutes = Math.max(1, Math.round((completedAt.getTime() - createdAt.getTime()) / 60000));
      order.completedAt = completedAt;
      order.fulfillmentMinutes = fulfillmentMinutes;
    }

    await order.save();

    const ticket = orderToTicket(order);
    io.emit('ticket:updated', ticket);
    await recalculateKitchenLoad();

    // If served, mark table as billing (only for dine-in orders with tableId)
    if (status === 'served' && order.orderType === 'dine-in' && order.tableId) {
      await Table.findOneAndUpdate({ number: order.tableId }, { status: 'billing' });
      const updatedTables = await Table.find().sort({ number: 1 });
      const mappedTables = updatedTables.map((t) => ({
        id: t.number,
        capacity: t.capacity,
        status: t.status,
      }));
      io.emit('tables:updated', mappedTables);
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/**
 * DELETE /api/orders/:id
 * Cancel / Delete an order ticket.
 */
router.delete('/:id', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const targetId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id || '');

    let order = null;
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      order = await Order.findById(targetId);
    }

    if (!order) {
      const allOrders = await Order.find();
      order = allOrders.find(
        (o) =>
          orderToTicket(o).id.toUpperCase() === targetId.toUpperCase() ||
          o._id.toString() === targetId
      );
    }

    if (!order) {
      res.status(404).json({ error: `Order not found with ID: ${targetId}` });
      return;
    }

    const orderIdStr = order._id.toString();
    const tableId = order.tableId;

    // Delete the order
    await Order.findByIdAndDelete(order._id);

    // Delete linked bill if exists
    await Bill.deleteMany({ orderIds: order._id });

    // Check if table has remaining active orders
    if (tableId) {
      const remainingTableOrders = await Order.find({ tableId, status: { $ne: 'billed' } });
      if (remainingTableOrders.length === 0) {
        await Table.findOneAndUpdate({ number: tableId }, { status: 'free' });
      }
    }

    // Broadcast socket updates & recalculate kitchen load
    const updatedTables = await Table.find().sort({ number: 1 });
    const mappedTables = updatedTables.map((t) => ({
      id: t.number,
      capacity: t.capacity,
      status: t.status,
    }));
    io.emit('tables:updated', mappedTables);
    const cancelPayload = { id: targetId, _id: orderIdStr, tableId: order.tableId, pickupCode: order.pickupCode, orderType: order.orderType };
    io.emit('ticket:deleted', cancelPayload);
    io.emit('ticket:cancelled', cancelPayload);
    io.emit('bill:updated', null);
    await recalculateKitchenLoad();

    res.json({ message: 'Order ticket deleted successfully', id: targetId, _id: orderIdStr });
  } catch (error) {
    console.error('Error deleting order ticket:', error);
    res.status(500).json({ error: 'Failed to delete order ticket' });
  }
});

export default router;
