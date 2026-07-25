import { Router, Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { io } from '../server.js';

const router = Router();

/**
 * GET /api/inventory
 * Stock levels + thresholds for all menu items.
 */
router.get('/', verifyToken, requireRole('staff', 'admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await MenuItem.find().sort({ stockQty: 1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * PATCH /api/inventory/:id/restock
 * Restock a menu item.
 * - Writes InventoryLog (reason: 'restock')
 * - Increments stockQty
 * - If item flips back to available, emits 'menu:updated'
 */
router.patch('/:id/restock', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { qty } = req.body;
    if (!qty || qty <= 0) {
      res.status(400).json({ error: 'qty must be a positive number' });
      return;
    }

    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    const wasPreviouslyOut = item.stockQty <= 0;

    // Write inventory log
    await InventoryLog.create({
      menuItemId: item._id,
      changeQty: qty,
      reason: 'restock',
    });

    // Increment stock
    item.stockQty += qty;
    await item.save();

    // If item was 86'd and now available, broadcast menu update
    if (wasPreviouslyOut && item.stockQty > 0) {
      console.log(`🔄 ${item.name} back in stock! Broadcasting menu update.`);
    }

    // Always broadcast updated menu — stock levels changed
    const updatedMenu = await MenuItem.find().sort({ category: 1, name: 1 });
    io.emit('menu:updated', updatedMenu);

    // Also broadcast inventory update for the staff panel
    const updatedInventory = await MenuItem.find().sort({ stockQty: 1 });
    io.emit('inventory:updated', updatedInventory);

    res.json(item);
  } catch (error) {
    console.error('Error restocking:', error);
    res.status(500).json({ error: 'Failed to restock item' });
  }
});

export default router;
