import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { getCallbackURL } from "./config";

export function setupGoogleAuth(app: Express) {
  // Skip Google OAuth setup if credentials are not available
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('⚠️ Google OAuth credentials not available - skipping Google Auth setup');
    return;
  }
  
  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: getCallbackURL()
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error("No email found in Google profile"));
      }

      // Check if user exists
      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Create new user
        const newUser = {
          email: email,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
          googleId: profile.id,
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          coinsBalance: 60, // Welcome bonus
          role: 'user'
        };

        user = await storage.createUser(newUser);

        // Add welcome transaction
        await storage.createTransaction({
          userId: user.id,
          type: 'welcome_bonus',
          amount: 60,
          reason: 'Welcome bonus for new users'
        });

        // Add welcome notification
        await storage.createNotification({
          userId: user.id,
          title: 'Welcome to Y2Big!',
          message: 'You have received 60 coins as a welcome bonus. Start watching videos to earn more!',
          type: 'bonus'
        });
      } else {
        // Update Google tokens for existing user
        user = await storage.updateUserProfile(user.id, {
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl
        });
      }

      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth routes
  app.get('/auth/google',
    passport.authenticate('google', { 
      scope: [
        'profile', 
        'email',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ],
      accessType: 'offline',
      prompt: 'consent'
    })
  );

  app.get('/oauth2callback',
    passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
    async (req, res) => {
      try {
        // If user is already logged in via Replit Auth, link their Google account
        if (req.session && (req.session as any).passport && (req.session as any).passport.user) {
          const replitUserId = (req.session as any).passport.user.claims?.sub;
          const googleUser = req.user as any;
          
          if (replitUserId && googleUser) {
            // Update the Replit user with Google tokens
            await storage.updateUserProfile(replitUserId, {
              googleAccessToken: googleUser.googleAccessToken,
              googleRefreshToken: googleUser.googleRefreshToken,
              googleId: googleUser.googleId
            });
            
            console.log(`✅ Linked Google account for Replit user ${replitUserId}`);
            return res.redirect('/?linked=youtube');
          }
        }
        
        // Otherwise, proceed with normal Google authentication
        res.redirect('/');
      } catch (error) {
        console.error('Error linking Google account:', error);
        res.redirect('/?error=link_failed');
      }
    }
  );

  // Logout route
  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Current user route
  app.get('/api/auth/user', async (req, res) => {
    if (req.user) {
      // Check if this is a Replit Auth user and fetch updated profile with Google tokens
      const user = req.user as any;
      if (user.claims?.sub) {
        try {
          const fullUser = await storage.getUser(user.claims.sub);
          if (fullUser) {
            res.json({
              ...user,
              googleAccessToken: fullUser.googleAccessToken,
              googleRefreshToken: fullUser.googleRefreshToken,
              googleId: fullUser.googleId
            });
            return;
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });
}

// Middleware to check if user is authenticated
export async function requireAuth(req: any, res: any, next: any) {
  try {
    // Check for session-based authentication first
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Check for Passport-based Google OAuth authentication
    if (req.user) {
      return next();
    }

    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
}