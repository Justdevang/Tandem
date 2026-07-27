import { Router, Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { computeKitchenLoad } from '../services/kitchenLoad.js';
import { catalogMenuItems } from '../data/catalog.js';

const router = Router();

/**
 * Helper to auto-seed menu catalog if database is empty or partial
 */
async function autoSeedCatalog() {
  try {
    for (const item of catalogMenuItems) {
      await MenuItem.findOneAndUpdate(
        { name: item.name },
        { $setOnInsert: item },
        { upsert: true, new: true }
      );
    }
    console.log('🌱 Auto-seeded full menu catalog into database.');
  } catch (err) {
    console.error('Failed to auto-seed menu catalog:', err);
  }
}

/**
 * GET /api/menu
 * List all menu items with isAvailable virtual and currentlyThrottled flag.
 * Public — no auth required (customers need to see the menu).
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    let items = await MenuItem.find().sort({ category: 1, name: 1 });
    if (items.length < 20) {
      await autoSeedCatalog();
      items = await MenuItem.find().sort({ category: 1, name: 1 });
    }

    const loadState = await computeKitchenLoad();

    const itemsWithThrottling = items.map((item) => {
      const obj = item.toObject({ virtuals: true });
      const isThrottled =
        loadState.loadLevel === 'High' && (item.avgPrepMinutes || 10) >= loadState.prepThresholdMinutes;
      return {
        ...obj,
        currentlyThrottled: isThrottled,
      };
    });

    res.json(itemsWithThrottling);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

/**
 * POST /api/menu
 * Create a new menu item. Staff/admin only.
 */
router.post('/', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

/**
 * PATCH /api/menu/:id
 * Edit a menu item. Staff/admin only.
 */
router.patch('/:id', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

export default router;
