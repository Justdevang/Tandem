import { Router, Request, Response } from 'express';
import { Table } from '../models/Table.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { io } from '../server.js';

const router = Router();

/**
 * GET /api/tables
 * List all tables with status.
 */
router.get('/', verifyToken, requireRole('staff', 'admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const tables = await Table.find().sort({ number: 1 });
    // Map to match frontend's Table type: { id, capacity, status }
    const mapped = tables.map((t) => ({
      id: t.number,
      capacity: t.capacity,
      status: t.status,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

/**
 * PATCH /api/tables/:id/status
 * Update table status. Emits 'tables:updated'.
 */
router.patch('/:id/status', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = req.params.id;
    const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
    const tableNumber = parseInt(idStr, 10);
    const { status } = req.body;

    if (!['free', 'occupied', 'billing'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const table = await Table.findOneAndUpdate(
      { number: tableNumber },
      { status },
      { new: true }
    );

    if (!table) {
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    // Broadcast updated tables to all clients
    const allTables = await Table.find().sort({ number: 1 });
    const mapped = allTables.map((t) => ({
      id: t.number,
      capacity: t.capacity,
      status: t.status,
    }));
    io.emit('tables:updated', mapped);

    res.json({ id: table.number, capacity: table.capacity, status: table.status });
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ error: 'Failed to update table status' });
  }
});

export default router;
