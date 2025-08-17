import express from 'express';
import session from 'express-session';
import { Request, Response, NextFunction } from 'express';

// Admin credentials (in production, these should be environment variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345';

// Extend session type to include admin authentication
declare module 'express-session' {
  interface SessionData {
    isAdminAuthenticated?: boolean;
    adminId?: string;
  }
}

// Middleware to check if user is admin authenticated
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.isAdminAuthenticated) {
    return next();
  }
  
  res.status(401).json({ 
    message: 'Admin authentication required',
    redirectTo: '/admin/login' 
  });
}

// Admin login route
export function setupAdminAuth(app: express.Application) {
  // Admin login endpoint
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { email, username, password } = req.body;
    const loginField = email || username; // Accept both email and username
    
    if (loginField === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.isAdminAuthenticated = true;
      req.session.adminId = 'admin'; // Set adminId for transaction logging
      res.json({ 
        success: true, 
        message: 'Admin authentication successful',
        redirectTo: '/admin'
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid admin credentials' 
      });
    }
  });
  
  // Admin logout endpoint
  app.post('/api/admin/logout', (req: Request, res: Response) => {
    req.session.isAdminAuthenticated = false;
    res.json({ 
      success: true, 
      message: 'Admin logged out successfully',
      redirectTo: '/admin/login'
    });
  });
  
  // Check admin authentication status
  app.get('/api/admin/auth-status', (req: Request, res: Response) => {
    res.json({ 
      isAuthenticated: !!req.session.isAdminAuthenticated 
    });
  });
}