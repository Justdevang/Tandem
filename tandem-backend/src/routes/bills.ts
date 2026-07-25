import { Router, Request, Response } from 'express';
import { Bill } from '../models/Bill.js';
import { Order } from '../models/Order.js';
import { Table } from '../models/Table.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { io } from '../server.js';

const TAX_RATE = 0.05; // 5% GST for restaurant

const router = Router();

/**
 * POST /api/bills
 * Generate a bill from order IDs.
 * Calculates total from order items + tax.
 */
router.post('/', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400).json({ error: 'orderIds[] is required' });
      return;
    }

    const orders = await Order.find({ _id: { $in: orderIds } }).populate('items.menuItemId');

    if (orders.length === 0) {
      res.status(404).json({ error: 'No orders found' });
      return;
    }

    // Calculate total from order items
    let subtotal = 0;
    for (const order of orders) {
      for (const item of order.items) {
        const menuItem = item.menuItemId as any;
        if (menuItem?.price) {
          subtotal += menuItem.price * item.qty;
        }
      }
    }

    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;

    const bill = await Bill.create({
      orderIds,
      total,
      tax,
      status: 'unpaid',
    });

    // Mark orders as billed
    await Order.updateMany({ _id: { $in: orderIds } }, { status: 'billed' });

    res.status(201).json(bill);
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

/**
 * PATCH /api/bills/:id/pay
 * Mark a bill as paid.
 */
router.patch('/:id/pay', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { method } = req.body; // 'cash' | 'card' | 'upi'

    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', method: method || 'card' },
      { new: true }
    ).populate('orderIds');

    if (!bill) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    // Free up the table(s) associated with these orders
    const orders = await Order.find({ _id: { $in: bill.orderIds } });
    const tableNumbers = [...new Set(orders.map((o) => o.tableId))];

    for (const tableNum of tableNumbers) {
      await Table.findOneAndUpdate({ number: tableNum }, { status: 'free' });
    }

    // Broadcast table updates
    const updatedTables = await Table.find().sort({ number: 1 });
    const mapped = updatedTables.map((t) => ({
      id: t.number,
      capacity: t.capacity,
      status: t.status,
    }));
    io.emit('tables:updated', mapped);

    res.json(bill);
  } catch (error) {
    console.error('Error paying bill:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

export default router;
