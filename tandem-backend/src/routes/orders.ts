import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { Table } from '../models/Table.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { io } from '../server.js';

const router = Router();

/**
 * Helper: format an Order document into the Ticket shape that
 * TicketRail.tsx expects: { id, _id, table, status, items, firedAt, elapsedMin }
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

  return {
    id: `T-${shortId}`,
    _id: orderIdStr,
    table: order.tableId,
    status: order.status || 'new',
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
 * THE CORE REAL-TIME CHAIN
 * ═══════════════════════════════════════════════════════════
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableId, items } = req.body;

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'tableId and items[] are required' });
      return;
    }

    // Consolidated line items (combine duplicate menuItemIds)
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

    // Resolve menu items and validate stock
    const orderItems = [];

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
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        qty: item.qty,
        notes: item.notes,
      });
    }

    // 1. Create Order
    const order = await Order.create({
      tableId: Number(tableId),
      items: orderItems,
      status: 'new',
    });

    // 2. Decrement stock & record InventoryLog (ensuring non-negative stock)
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

      // Clamp stockQty to minimum 0 to prevent negative stock values
      if (updatedMenuItem && updatedMenuItem.stockQty < 0) {
        updatedMenuItem.stockQty = 0;
        await updatedMenuItem.save();
      }
    }

    // 3. Mark table as occupied
    await Table.findOneAndUpdate({ number: Number(tableId) }, { status: 'occupied' });

    // 4. Broadcast updated menu & inventory to all clients
    const updatedMenu = await MenuItem.find().sort({ category: 1, name: 1 });
    io.emit('menu:updated', updatedMenu);

    const updatedInventory = await MenuItem.find().sort({ stockQty: 1 });
    io.emit('inventory:updated', updatedInventory);

    // 5. Broadcast ticket to staff kitchen display
    const ticket = orderToTicket(order);
    io.emit('ticket:new', ticket);

    // 6. Broadcast updated tables floor
    const updatedTables = await Table.find().sort({ number: 1 });
    const mappedTables = updatedTables.map((t) => ({
      id: t.number,
      capacity: t.capacity,
      status: t.status,
    }));
    io.emit('tables:updated', mappedTables);

    res.status(201).json({ order, ticket });
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
      // Fallback search by formatted ID string (e.g. T-0231)
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

    order.status = status;
    await order.save();

    const ticket = orderToTicket(order);
    io.emit('ticket:updated', ticket);

    // If served, mark table as billing
    if (status === 'served') {
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

export default router;
