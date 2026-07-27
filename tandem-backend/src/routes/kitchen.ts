import { Router, Request, Response } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  computeKitchenLoad,
  setManualBusyOverride,
  setDemoSpike,
} from '../services/kitchenLoad.js';

const router = Router();

/**
 * GET /api/kitchen/load
 * Public / Staff endpoint returning current kitchen queue load level.
 */
router.get('/load', async (_req: Request, res: Response): Promise<void> => {
  try {
    const loadState = await computeKitchenLoad();
    res.json(loadState);
  } catch (error) {
    console.error('Error fetching kitchen load:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen load' });
  }
});

/**
 * POST /api/kitchen/load/override
 * Staff/Admin endpoint to toggle manual busy override mode.
 */
router.post('/load/override', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { isManualBusy } = req.body;
    const freshState = await setManualBusyOverride(Boolean(isManualBusy));
    res.json(freshState);
  } catch (error) {
    console.error('Error updating kitchen load override:', error);
    res.status(500).json({ error: 'Failed to update kitchen load override' });
  }
});

/**
 * POST /api/kitchen/load/demo-spike
 * Dev/Demo endpoint to trigger simulated rush load spike for pitch demos.
 */
router.post('/load/demo-spike', verifyToken, requireRole('staff', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { active } = req.body;
    const finalState = await setDemoSpike(Boolean(active));
    res.json(finalState);
  } catch (error) {
    console.error('Error toggling demo spike:', error);
    res.status(500).json({ error: 'Failed to toggle demo spike' });
  }
});

export default router;
