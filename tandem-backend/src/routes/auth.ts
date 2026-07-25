import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/sync
 * Create or update user on first login.
 * Requires valid Firebase ID token.
 */
router.post('/sync', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, email } = req.user!;
    const { name, role } = req.body;

    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // Update existing user
      if (name) user.name = name;
      if (email) user.email = email;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        firebaseUid: uid,
        email: email || '',
        name: name || email || 'Anonymous',
        role: role || 'customer',
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Auth sync error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

export default router;
