import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user has a session
    if (!(req as any).session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user from database
    const user = await storage.getUser((req as any).session.userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: `Account is ${user.status}` });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};