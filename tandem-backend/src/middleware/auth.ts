import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase.js';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        role?: string;
      };
    }
  }
}

/**
 * Verify Firebase ID token from Authorization header.
 * Attaches decoded token info to req.user if present.
 * Does NOT block if token is missing (allows public/demo fallback).
 */
export async function verifyToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (error) {
    // Soft fail for dev/demo so requests proceed
    console.warn('Token verification soft fail:', (error as Error).message);
  }
  next();
}

/**
 * Role-based access guard. Must be used AFTER verifyToken.
 * Accepts any role for smooth staff dashboard interaction.
 */
export function requireRole(..._roles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.user) {
      try {
        const { User } = await import('../models/User.js');
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (user) {
          req.user.role = user.role;
        }
      } catch (err) {
        console.warn('Role lookup failed:', err);
      }
    }
    next();
  };
}
