import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupGoogleAuth, requireAuth } from "./googleAuth";
import { setupAdminAuth, requireAdminAuth } from "./adminAuth";
import { insertVideoSchema, insertTransactionSchema, insertVideoReportSchema, insertSystemSettingSchema } from "@shared/schema";
import Stripe from "stripe";
import { paymentConfig } from "./paymentConfig";
import fetch from "node-fetch";
import { setupWebSocket, setSocketIO, broadcastDatabaseChange } from "./websocket";

// Utility function to generate unique order IDs
function generateOrderId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `YTB-${timestamp.slice(-8)}-${random}`;
}

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20" as any,
  });
} else {
  console.warn('STRIPE_SECRET_KEY not provided - Stripe payment features will be disabled');
}

// Initialize payment providers on startup
paymentConfig.initializeDefaultProviders().then(() => {
  console.log('Payment providers initialized');
}).catch(error => {
  console.error('Failed to initialize payment providers:', error);
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);
  
  // Setup WebSocket
  const io = setupWebSocket(server);
  setSocketIO(io);
  
  // Setup Google OAuth authentication
  setupGoogleAuth(app);
  
  // Setup admin authentication
  setupAdminAuth(app);
  
  // Admin auth status endpoint
  app.get('/api/admin/auth-status', (req: any, res) => {
    res.json({ requireAuth: req.session?.adminId !== undefined });
  });

  // Google OAuth config endpoint for frontend
  app.get('/api/google-config', (req, res) => {
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      apiKey: process.env.YOUTUBE_API_KEY || ''
    });
  });

  // Admin logout endpoint
  app.post('/api/admin/logout', (req: any, res) => {
    req.session.adminId = undefined;
    res.json({ success: true });
  });
  
  // Initialize default system settings
  try {
    // Initialize YouTube API key from environment
    if (process.env.YOUTUBE_API_KEY) {
      await storage.setSystemSetting({
        key: 'youtube_api_key',
        value: process.env.YOUTUBE_API_KEY,
        description: 'YouTube Data API v3 key for fetching video metadata',
        category: 'api'
      });
      console.log('YouTube API key initialized in system settings');
    }
    console.log('System settings initialized');
  } catch (error) {
    console.log('System settings already exist or error initializing:', error);
  }

  // Traditional auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Check if username is taken
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        username,
        email,
        passwordHash,
        coinsBalance: 1000, // Welcome bonus
        welcomeBonusReceived: true,
      });

      // Create welcome bonus transaction
      await storage.createTransaction({
        userId: newUser.id,
        type: 'welcome_bonus',
        amount: 1000,
        reason: 'Welcome bonus for new account',
      });

      // Set session
      (req as any).session.userId = newUser.id;
      
      res.json({ user: newUser, message: 'Account created successfully' });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if user is banned or suspended
      if (user.status !== 'active') {
        return res.status(403).json({ message: `Account is ${user.status}` });
      }

      // Set session
      (req as any).session.userId = user.id;
      
      res.json({ user, message: 'Login successful' });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Video routes
  app.post('/api/videos', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Map form fields to database schema
      const {
        youtubeId,
        title,
        thumbnailUrl,
        duration,
        durationSeconds,
        targetWatches,
        watchTimeRequired,
        coinsRequired,
        requestedWatches,
        requestedWatchSeconds,
        boostLevel,
        ...otherData
      } = req.body;

      console.log('Received video submission data:', {
        youtubeId,
        requestedWatches,
        requestedWatchSeconds,
        boostLevel,
        targetWatches,
        watchTimeRequired,
        coinsRequired
      });

      // Map frontend fields to backend fields
      const numericTargetWatches = Number(requestedWatches || targetWatches) || 1;
      const numericWatchTimeRequired = Number(requestedWatchSeconds || watchTimeRequired) || 30;
      const numericBoostLevel = Number(boostLevel) || 0;
      
      // Calculate cost exactly like the frontend does
      const baseCost = numericWatchTimeRequired * numericTargetWatches;
      const boostCost = numericBoostLevel * 50; // 50 coins per boost level
      const totalCost = baseCost + boostCost;

      console.log('Cost calculation:', {
        watchTimeRequired: numericWatchTimeRequired,
        targetWatches: numericTargetWatches,
        baseCost,
        boostLevel: numericBoostLevel,
        boostCost,
        totalCost
      });
      
      // Check user balance
      const user = await storage.getUser(userId);
      if (!user || (user.coinsBalance || 0) < totalCost) {
        return res.status(400).json({ message: "Insufficient coins" });
      }

      // Create video with all required fields properly mapped
      const video = await storage.createVideo({
        userId,
        youtubeId,
        title: title || `Video ${youtubeId}`,
        thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        durationSeconds: Number(durationSeconds || duration) || 300,
        requestedWatchSeconds: numericWatchTimeRequired,
        requestedWatches: numericTargetWatches,
        coinsRequiredTotal: totalCost,
        boostLevel: numericBoostLevel,
        orderId: `YTB-${Math.floor(Math.random() * 100000000)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: "active",
        coinsSpent: 0,
        completedWatches: 0,
        reportCount: 0,
      });

      // Deduct coins from user balance (escrow)
      console.log(`Deducting ${totalCost} coins from user ${userId} for video submission`);
      const updatedUser = await storage.updateUserCoins(userId, -totalCost);
      console.log(`User balance after deduction: ${updatedUser.coinsBalance}`);
      
      // Emit real-time balance update
      io.to(`user_${userId}`).emit('balance_updated', { 
        newBalance: updatedUser.coinsBalance,
        change: -totalCost,
        reason: 'Video submission'
      });

      // Create watch jobs immediately since video is auto-approved
      const jobs = Array.from({ length: numericTargetWatches }, () => ({
        videoId: video.id,
        watchSecondsRequired: numericWatchTimeRequired,
      }));
      await storage.createWatchJobs(jobs);

      // Create transaction with detailed reason
      await storage.createTransaction({
        userId,
        type: "spend_coins",
        amount: -totalCost,
        reason: `Video submission: "${title || `Video ${youtubeId}`}" - ${numericTargetWatches} views x ${numericWatchTimeRequired}s = ${totalCost} coins`,
        details: { videoId: video.id, purpose: "video_submission", orderId: video.orderId },
      });

      // Create coin adjustment notification
      await storage.createNotification({
        userId,
        title: "Coins Deducted",
        message: `${totalCost} coins deducted for video submission: "${title || `Video ${youtubeId}`}"`,
        type: "coin_adjustment",
        priority: "normal",
        isRead: false,
      });

      // Create notification for video campaign going live
      await storage.createNotification({
        userId,
        title: "Video Campaign Live!",
        message: `Your video "${title || 'Video'}" is now live and earning views! Order ID: ${video.orderId}`,
        type: "video_live",
        priority: "normal",
        isRead: false,
      });

      // Broadcast real-time database updates
      broadcastDatabaseChange('video_created', { video, userId });
      broadcastDatabaseChange('transaction_created', { 
        userId, 
        amount: -totalCost, 
        type: "spend_coins", 
        reason: "Video submission" 
      }, userId);
      broadcastDatabaseChange('watch_queue_updated', { videoId: video.id });

      res.json(video);
    } catch (error: any) {
      console.error("Error creating video:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/videos/:userId?', async (req, res) => {
    try {
      const { status } = req.query;
      const { userId } = req.params;
      const videos = await storage.getVideos({
        status: status as string,
        userId: userId as string,
      });
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  // YouTube API integration routes
  app.get('/api/youtube/video/:videoId', async (req, res) => {
    try {
      const { videoId } = req.params;
      // Get YouTube API key from database first, then fallback to environment
      const dbApiKey = await storage.getSystemSetting('youtube_api_key');
      const apiKey = dbApiKey?.value || process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        console.warn('YouTube API key not configured, returning mock data');
        const mockData = {
          id: videoId,
          title: "Sample Video Title",
          channelTitle: "Sample Channel",
          viewCount: Math.floor(Math.random() * 1000000),
          publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          duration: 300,
          thumbnails: {
            maxres: {
              url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            }
          }
        };
        return res.json(mockData);
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
      );
      
      const data: any = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      const video = data.items[0];
      const snippet = video.snippet;
      
      // Get channel information
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${snippet.channelId}&key=${apiKey}`
      );
      
      const channelData: any = await channelResponse.json();
      const channelInfo = channelData.items?.[0]?.snippet || {};
      
      // Parse duration (PT#M#S format)
      const duration = video.contentDetails.duration;
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match?.[1] || '0');
      const minutes = parseInt(match?.[2] || '0');
      const seconds = parseInt(match?.[3] || '0');
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      res.json({
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        channelThumbnail: channelInfo.thumbnails?.default?.url || '',
        thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
        duration: totalSeconds,
        viewCount: parseInt(video.statistics.viewCount || '0'),
        likeCount: parseInt(video.statistics.likeCount || '0'),
        publishedAt: snippet.publishedAt
      });
      
    } catch (error) {
      console.error('YouTube API error:', error);
      res.status(500).json({ message: 'Failed to fetch video data' });
    }
  });

  app.post('/api/youtube/like', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { videoId } = req.body;
      const user = req.user;
      
      let youtubeSync = false;
      let youtubeMessage = "Like recorded locally";
      
      // Try to like on actual YouTube if user has Google access token
      if (user?.google_access_token) {
        try {
          const response = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${videoId}&rating=like`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.google_access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            youtubeSync = true;
            youtubeMessage = "Video liked on YouTube!";
            console.log(`✅ User ${userId} successfully liked video ${videoId} on YouTube`);
          } else {
            console.log(`⚠️ YouTube API failed for user ${userId} on video ${videoId}: ${response.status}`);
          }
        } catch (youtubeError) {
          console.error('YouTube API error:', youtubeError);
        }
      } else {
        console.log(`⚠️ User ${userId} has no Google access token - like recorded locally only`);
      }
      
      // Award bonus coins for engagement
      await storage.updateUserBalance(userId, 5, 'earn', `Bonus for liking video ${videoId}`);
      
      console.log(`User ${userId} liked video ${videoId} - awarded 5 bonus coins`);
      
      res.json({ 
        success: true, 
        youtubeSync,
        message: youtubeMessage,
        bonusCoins: 5 
      });
    } catch (error) {
      console.error("Error liking video:", error);
      res.status(500).json({ message: "Failed to like video" });
    }
  });

  app.post('/api/youtube/comment', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { videoId, comment } = req.body;
      
      if (!comment || comment.trim().length < 3) {
        return res.status(400).json({ message: "Comment must be at least 3 characters long" });
      }
      
      // Award bonus coins for commenting
      await storage.updateUserBalance(userId, 10, 'earn', `Bonus for commenting on video ${videoId}`);
      
      console.log(`User ${userId} commented on video ${videoId}: "${comment.substring(0, 50)}..." - awarded 10 bonus coins`);
      
      res.json({ 
        success: true, 
        message: "Comment posted", 
        bonusCoins: 10 
      });
    } catch (error) {
      console.error("Error posting comment:", error);
      res.status(500).json({ message: "Failed to post comment" });
    }
  });

  // Enhanced YouTube session route - shows user as logged into YouTube
  app.get('/api/youtube/watch/:videoId', requireAuth, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Generate authenticated session for video watching
      const sessionData = {
        sessionId: Date.now().toString(),
        userId,
        videoId,
        startTime: new Date().toISOString(),
        requireAuth: true,
        userEmail: user?.email || req.user.claims.email || 'viewer@gmail.com',
        userName: user?.firstName || user?.email?.split('@')[0] || 'User',
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&origin=${req.get('origin') || 'http://localhost:5000'}`,
        directUrl: `https://www.youtube.com/watch?v=${videoId}&t=0s`,
        loginIndicator: true,
        platform: 'YouTube Watch Hours Exchange'
      };
      
      res.json(sessionData);
    } catch (error) {
      console.error('YouTube session error:', error);
      res.status(500).json({ message: 'Failed to create YouTube session' });
    }
  });

  // Watch routes
  app.get('/api/watch/available', requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getAvailableWatchJobs(20);
      
      // Get video details for each job and filter only published/active videos
      const jobsWithVideos = await Promise.all(
        jobs.map(async (job) => {
          const video = await storage.getVideo(job.videoId);
          return { ...job, video };
        })
      );

      // Filter to only show videos that are active (published)
      const publishedJobs = jobsWithVideos.filter(job => 
        job.video && 
        job.video.status === 'active' && 
        !job.video.flaggedAt
      );

      // AI Algorithm: Enhanced priority sorting on server-side
      const prioritizedJobs = publishedJobs.sort((a: any, b: any) => {
        const boostA = a.video?.boostLevel || 0;
        const boostB = b.video?.boostLevel || 0;
        
        // Primary: Boost level priority (5x gets 5000 points, 2x gets 2000 points)
        const boostScoreA = boostA * 1000;
        const boostScoreB = boostB * 1000;
        
        if (boostScoreA !== boostScoreB) return boostScoreB - boostScoreA;
        
        // Secondary: Video reward value
        const rewardA = a.watchSecondsRequired || 0;
        const rewardB = b.watchSecondsRequired || 0;
        
        if (rewardA !== rewardB) return rewardB - rewardA;
        
        // Tertiary: Creation time (newer first for engagement)
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        
        return timeB - timeA;
      });

      res.json(prioritizedJobs);
    } catch (error) {
      console.error("Error fetching available jobs:", error);
      res.status(500).json({ message: "Failed to fetch available jobs" });
    }
  });

  app.post('/api/watch/assign', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId } = req.body;

      const job = await storage.assignWatchJob(jobId, userId);
      res.json(job);
    } catch (error: any) {
      console.error("Error assigning watch job:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/watch/complete', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId, watchSeconds, sessionData } = req.body;

      const job = await storage.completeWatchJob(jobId);
      if (job.assignedToUserId !== userId) {
        return res.status(403).json({ message: "Job not assigned to you" });
      }

      const video = await storage.getVideo(job.videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Calculate coins earned (1 coin per second watched)
      const coinsEarned = Math.min(watchSeconds, job.watchSecondsRequired);

      // Award coins to watcher
      const updatedUser = await storage.updateUserCoins(userId, coinsEarned);

      // Emit real-time balance update
      io.to(`user_${userId}`).emit('balance_updated', { 
        newBalance: updatedUser.coinsBalance,
        change: coinsEarned,
        reason: 'Watch completed'
      });

      // Create watch history
      await storage.createWatchHistory({
        watcherId: userId,
        videoId: job.videoId,
        watchSeconds,
        coinsEarned,
        clientSession: sessionData?.sessionId || '',
        ipAddress: req.ip,
        deviceInfo: sessionData || {},
      });

      // Create transaction
      await storage.createTransaction({
        userId,
        type: "earn_watch",
        amount: coinsEarned,
        reason: `Watch reward for completing video`,
        details: { videoId: job.videoId, jobId: job.id },
      });

      res.json({ coinsEarned, job });
    } catch (error: any) {
      console.error("Error completing watch:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Account routes
  app.get('/api/account/balance', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json({ balance: user?.coinsBalance || 0 });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  app.get('/api/account/transactions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await storage.getTransactionsByUser(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/account/watch-history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const history = await storage.getWatchHistoryByUser(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching watch history:", error);
      res.status(500).json({ message: "Failed to fetch watch history" });
    }
  });

  // Payment routes
  app.get('/api/payments/packages', (req, res) => {
    const packages = [
      { id: 'starter', name: 'Starter Pack', coins: 500, price: 4.99 },
      { id: 'growth', name: 'Growth Pack', coins: 1200, price: 9.99 },
      { id: 'pro', name: 'Pro Pack', coins: 2500, price: 19.99 },
      { id: 'business', name: 'Business Pack', coins: 5500, price: 39.99 },
    ];
    res.json(packages);
  });

  // Get enabled payment providers for public use
  app.get('/api/payment-providers/enabled', async (req, res) => {
    try {
      const providers = await storage.getAllPaymentProviders();
      const enabledProviders = providers.filter((p: any) => p.isEnabled).map((provider: any) => ({
        id: provider.id,
        provider: provider.provider,
        displayName: provider.displayName,
        isEnabled: provider.isEnabled,
        sortOrder: provider.sortOrder
      }));
      res.json(enabledProviders);
    } catch (error) {
      console.error("Error fetching enabled providers:", error);
      res.status(500).json({ message: "Failed to fetch payment providers" });
    }
  });

  // YouTube metadata endpoint for streaming page
  app.get('/api/youtube/metadata/:videoId', async (req, res) => {
    console.log(`📡 API Route hit: /api/youtube/metadata/${req.params.videoId}`);
    try {
      const { videoId } = req.params;
      
      // Get YouTube API key from database first, then fallback to environment
      const dbApiKey = await storage.getSystemSetting('youtube_api_key');
      const apiKey = dbApiKey?.value || process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        console.warn('YouTube API key not configured');
        return res.status(500).json({ message: 'YouTube API key not configured' });
      }

      console.log(`Fetching YouTube data for video: ${videoId}`);

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
      );
      
      const data = await response.json() as any;
      
      if (!response.ok) {
        console.error('YouTube API error:', data);
        return res.status(response.status).json({ message: 'YouTube API request failed' });
      }
      
      if (!data.items || data.items.length === 0) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      const video = data.items[0];
      const snippet = video.snippet;
      
      // Get channel information
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${snippet.channelId}&key=${apiKey}`
      );
      
      const channelData = await channelResponse.json() as any;
      const channelInfo = channelData.items?.[0] || {};
      
      // Parse duration (PT#M#S format)
      const duration = video.contentDetails.duration;
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match?.[1] || '0');
      const minutes = parseInt(match?.[2] || '0');
      const seconds = parseInt(match?.[3] || '0');
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      const result = {
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        channelThumbnail: channelInfo.snippet?.thumbnails?.default?.url || '',
        thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
        duration: totalSeconds,
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        subscriberCount: parseInt(channelInfo.statistics?.subscriberCount || '0'),
        publishedAt: snippet.publishedAt
      };

      console.log(`YouTube data fetched successfully:`, {
        title: result.title,
        channelTitle: result.channelTitle,
        viewCount: result.viewCount,
        likeCount: result.likeCount,
        subscriberCount: result.subscriberCount
      });

      res.json(result);
      
    } catch (error) {
      console.error('YouTube metadata API error:', error);
      res.status(500).json({ message: 'Failed to fetch video data' });
    }
  });

  // YouTube API endpoint to get video and channel details
  app.get('/api/youtube/video/:videoId', async (req, res) => {
    try {
      const { videoId } = req.params;
      
      // Get YouTube API key from database first, then fallback to environment
      const dbApiKey = await storage.getSystemSetting('youtube_api_key');
      const apiKey = dbApiKey?.value || process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        console.warn('YouTube API key not configured, returning mock data');
        // Return mock data when API key is not configured
        return res.json({
          id: videoId,
          title: `Sample Video ${videoId}`,
          description: 'Sample video description',
          channelId: 'UCsampleChannelId',
          channelTitle: 'Sample Channel',
          channelThumbnail: '',
          thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          duration: 300,
          viewCount: 1000,
          likeCount: 50,
          publishedAt: new Date().toISOString()
        });
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
      );
      
      const data = await response.json() as any;
      
      if (!data.items || data.items.length === 0) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      const video = data.items[0];
      const snippet = video.snippet;
      
      // Get channel information
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${snippet.channelId}&key=${apiKey}`
      );
      
      const channelData = await channelResponse.json() as any;
      const channelInfo = channelData.items?.[0] || {};
      
      // Parse duration (PT#M#S format)
      const duration = video.contentDetails.duration;
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const hours = parseInt(match?.[1] || '0');
      const minutes = parseInt(match?.[2] || '0');
      const seconds = parseInt(match?.[3] || '0');
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      
      const result = {
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        channelThumbnail: channelInfo.snippet?.thumbnails?.default?.url || '',
        thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
        duration: totalSeconds,
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        subscriberCount: parseInt(channelInfo.statistics?.subscriberCount || '0'),
        publishedAt: snippet.publishedAt
      };
      
      console.log('📊 YOUTUBE API RESPONSE:', {
        title: result.title,
        channelTitle: result.channelTitle,
        viewCount: result.viewCount,
        likeCount: result.likeCount,
        subscriberCount: result.subscriberCount,
        channelThumbnail: result.channelThumbnail
      });
      
      res.json(result);
      
    } catch (error) {
      console.error('YouTube API error:', error);
      res.status(500).json({ message: 'Failed to fetch video data' });
    }
  });

  // YouTube Data Extraction API
  app.post('/api/youtube/extract', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
        return res.status(400).json({ message: 'Invalid YouTube URL' });
      }

      // Extract YouTube ID
      let youtubeId = '';
      if (url.includes('youtube.com/watch?v=')) {
        youtubeId = new URL(url).searchParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        youtubeId = new URL(url).pathname.slice(1);
      }

      if (!youtubeId) {
        return res.status(400).json({ message: 'Could not extract video ID' });
      }

      // Try to fetch real YouTube data using multiple methods
      try {
        // First try oEmbed API for basic metadata
        const oembedResponse = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
        );
        
        let videoData = {
          youtubeId,
          title: `YouTube Video - ${youtubeId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
          duration: 300, // Default 5 minutes
          channelName: 'YouTube Channel',
          description: 'Video description would be fetched from YouTube API',
        };

        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json() as any;
          videoData = {
            youtubeId,
            title: oembedData.title || videoData.title,
            thumbnailUrl: oembedData.thumbnail_url || videoData.thumbnailUrl,
            duration: 300, // Will be updated below
            channelName: oembedData.author_name || videoData.channelName,
            description: `Video by ${oembedData.author_name || 'YouTube Channel'}`,
          };
        }

        // Try to fetch duration from YouTube page directly
        try {
          const pageResponse = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (pageResponse.ok) {
            const pageText = await pageResponse.text();
            
            // Extract duration from JSON-LD structured data
            const jsonLdMatch = pageText.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/g);
            if (jsonLdMatch) {
              try {
                const jsonData = JSON.parse(jsonLdMatch[1]);
                if (jsonData.duration) {
                  // Parse ISO 8601 duration (PT4M13S -> 253 seconds)
                  const durationMatch = jsonData.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                  if (durationMatch) {
                    const hours = parseInt(durationMatch[1] || '0');
                    const minutes = parseInt(durationMatch[2] || '0');
                    const seconds = parseInt(durationMatch[3] || '0');
                    videoData.duration = hours * 3600 + minutes * 60 + seconds;
                  }
                }
              } catch (jsonParseError) {
                console.log('Failed to parse JSON-LD duration');
              }
            }

            // Alternative: Extract from meta tags
            if (videoData.duration === 300) {
              const metaDurationMatch = pageText.match(/"lengthSeconds":"(\d+)"/);
              if (metaDurationMatch) {
                videoData.duration = parseInt(metaDurationMatch[1]);
              }
            }

            // Extract better title if available
            const titleMatch = pageText.match(/<meta property="og:title" content="([^"]+)"/);
            if (titleMatch && titleMatch[1] !== videoData.title) {
              videoData.title = titleMatch[1];
            }
          }
        } catch (pageError) {
          console.log('Failed to fetch YouTube page for duration extraction');
        }

        return res.json(videoData);
        
      } catch (oembedError) {
        console.log('oEmbed failed, using fallback data');
      }

      // Fallback data if oEmbed fails
      const videoData = {
        youtubeId,
        title: `YouTube Video - ${youtubeId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        duration: 300, // Default 5 minutes
        channelName: 'YouTube Channel',
        description: 'Video description would be fetched from YouTube API',
      };

      res.json(videoData);
    } catch (error: any) {
      console.error('Error extracting YouTube data:', error);
      res.status(500).json({ message: 'Failed to extract video data' });
    }
  });

  // Binance payment endpoints
  app.post('/api/payments/binance/create', requireAuth, async (req: any, res) => {
    try {
      const { packageId } = req.body;
      const userId = req.user.id;

      const packages: Record<string, { coins: number; price: number }> = {
        starter: { coins: 500, price: 4.99 },
        growth: { coins: 1200, price: 9.99 },
        pro: { coins: 2500, price: 19.99 },
        business: { coins: 5500, price: 39.99 },
      };

      const selectedPackage = packages[packageId];
      if (!selectedPackage) {
        return res.status(400).json({ message: "Invalid package" });
      }

      // Create Binance payment record
      const paymentId = 'bnc_' + Math.random().toString(36).substr(2, 9);
      
      await storage.createPayment({
        userId,
        provider: "binance",
        providerStatus: "pending",
        amountUsd: selectedPackage.price.toString(),
        coinsAdded: selectedPackage.coins,
        providerRef: paymentId,
      });

      // In real implementation, you'd integrate with Binance Pay API
      res.json({ 
        paymentId,
        amount: selectedPackage.price,
        coins: selectedPackage.coins,
        qrCode: `binance://pay?amount=${selectedPackage.price}&merchant=watchexchange&ref=${paymentId}`,
      });
    } catch (error: any) {
      console.error("Error creating Binance payment:", error);
      res.status(500).json({ message: "Error creating payment: " + error.message });
    }
  });

  app.post('/api/payments/binance/confirm', requireAuth, async (req: any, res) => {
    try {
      const { paymentId } = req.body;
      const userId = req.user.id;

      // In real implementation, verify with Binance Pay API
      // For now, simulate successful payment
      
      // Find payment record and update
      // Note: This would need proper payment lookup in storage
      const packages: Record<string, { coins: number; price: number }> = {
        starter: { coins: 500, price: 4.99 },
        growth: { coins: 1200, price: 9.99 },
        pro: { coins: 2500, price: 19.99 },
        business: { coins: 5500, price: 39.99 },
      };

      // For demo, assume growth package
      const coins = 1200;
      
      // Add coins to user
      const updatedUser = await storage.updateUserCoins(userId, coins);

      // Emit real-time balance update
      io.to(`user_${userId}`).emit('balance_updated', { 
        newBalance: updatedUser.coinsBalance,
        change: coins,
        reason: 'Binance Pay deposit'
      });

      // Create transaction
      await storage.createTransaction({
        userId,
        type: "buy_coins",
        amount: coins,
        reason: `Deposit via Binance Pay - ${coins} coins added`,
        paymentRef: paymentId,
        details: { provider: "binance" },
      });

      // Create notification for deposit
      await storage.createNotification({
        userId,
        title: "Deposit Successful!",
        message: `${coins} coins have been added to your account via Binance Pay.`,
        type: "deposit",
        priority: "normal",
        isRead: false,
      });

      res.json({ success: true, coinsAdded: coins });
    } catch (error: any) {
      console.error("Error confirming Binance payment:", error);
      res.status(500).json({ message: "Error confirming payment: " + error.message });
    }
  });

  // PayPal payment endpoints
  app.post('/api/payments/paypal/create', requireAuth, async (req: any, res) => {
    try {
      const { packageId } = req.body;
      const userId = req.user.id;

      const packages: Record<string, { coins: number; price: number }> = {
        starter: { coins: 500, price: 4.99 },
        growth: { coins: 1200, price: 9.99 },
        pro: { coins: 2500, price: 19.99 },
        business: { coins: 5500, price: 39.99 },
      };

      const selectedPackage = packages[packageId];
      if (!selectedPackage) {
        return res.status(400).json({ message: "Invalid package" });
      }

      // Create PayPal payment record
      const paymentId = 'pp_' + Math.random().toString(36).substr(2, 9);
      
      await storage.createPayment({
        userId,
        provider: "paypal",
        providerStatus: "pending",
        amountUsd: selectedPackage.price.toString(),
        coinsAdded: selectedPackage.coins,
        providerRef: paymentId,
      });

      // In real implementation, you'd integrate with PayPal SDK
      res.json({ 
        paymentId,
        amount: selectedPackage.price,
        coins: selectedPackage.coins,
        approvalUrl: `https://www.paypal.com/checkoutnow?token=${paymentId}`,
        message: 'Redirecting to PayPal for payment'
      });
    } catch (error: any) {
      console.error("Error creating PayPal payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.post('/api/payments/paypal/confirm', requireAuth, async (req: any, res) => {
    try {
      const { paymentId } = req.body;
      const userId = req.user.id;

      // In real implementation, you'd verify with PayPal API
      const packages: Record<string, { coins: number; price: number }> = {
        starter: { coins: 500, price: 4.99 },
        growth: { coins: 1200, price: 9.99 },
        pro: { coins: 2500, price: 19.99 },
        business: { coins: 5500, price: 39.99 },
      };

      // For demo, assume growth package
      const coins = 1200;
      
      // Add coins to user
      const updatedUser = await storage.updateUserCoins(userId, coins);

      // Emit real-time balance update
      io.to(`user_${userId}`).emit('balance_updated', { 
        newBalance: updatedUser.coinsBalance,
        change: coins,
        reason: 'PayPal deposit'
      });

      // Create transaction
      await storage.createTransaction({
        userId,
        type: "buy_coins",
        amount: coins,
        paymentRef: paymentId,
        details: { provider: "paypal" },
      });

      res.json({ 
        success: true,
        coinsAdded: coins,
        message: 'Payment confirmed successfully'
      });
    } catch (error: any) {
      console.error("Error confirming PayPal payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  app.post("/api/create-payment-intent", requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ 
        message: "Payment system unavailable - Stripe not configured" 
      });
    }
    
    try {
      const { packageId } = req.body;
      const userId = req.user.id;

      const packages: Record<string, { coins: number; price: number }> = {
        starter: { coins: 500, price: 4.99 },
        growth: { coins: 1200, price: 9.99 },
        pro: { coins: 2500, price: 19.99 },
        business: { coins: 5500, price: 39.99 },
      };

      const selectedPackage = packages[packageId];
      if (!selectedPackage) {
        return res.status(400).json({ message: "Invalid package" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(selectedPackage.price * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId,
          packageId,
          coins: selectedPackage.coins.toString(),
        },
      });

      // Create payment record
      await storage.createPayment({
        userId,
        provider: "stripe",
        providerStatus: "pending",
        amountUsd: selectedPackage.price.toString(),
        coinsAdded: selectedPackage.coins,
        providerRef: paymentIntent.id,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Cryptomus payment endpoints
  app.post('/api/payments/cryptomus/create', requireAuth, async (req: any, res) => {
    try {
      const { packageId, customerEmail, amount, currency } = req.body;
      const userId = req.user.id;

      // Get package details
      const packages = [
        { id: 'starter', name: 'Starter Pack', coins: 500, price: 4.99 },
        { id: 'growth', name: 'Growth Pack', coins: 1200, price: 9.99 },
        { id: 'pro', name: 'Pro Pack', coins: 3000, price: 19.99 },
        { id: 'business', name: 'Business Pack', coins: 8000, price: 49.99 }
      ];
      
      const selectedPackage = packages.find(p => p.id === packageId);
      if (!selectedPackage) {
        return res.status(400).json({ error: 'Invalid package' });
      }

      // Create payment record
      const payment = await storage.createPayment({
        userId,
        provider: 'cryptomus',
        providerStatus: 'pending',
        amountUsd: selectedPackage.price.toString(),
        coinsAdded: selectedPackage.coins,
      });

      // In production, you would make API call to Cryptomus
      // For now, simulate payment creation
      const cryptomusPayment = {
        paymentId: payment.id,
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Example Bitcoin address
        amount: (selectedPackage.price * 0.000025).toFixed(8), // Simulate BTC conversion
        currency: 'BTC',
        qrCode: `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><text x="50" y="50" text-anchor="middle" font-size="8">QR Code</text></svg>`).toString('base64')}`,
        expiryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };

      res.json(cryptomusPayment);
    } catch (error) {
      console.error('Cryptomus payment creation error:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  });

  app.post('/api/payments/cryptomus/confirm', requireAuth, async (req: any, res) => {
    try {
      const { paymentId } = req.body;
      const userId = req.user.id;

      // Get payment record
      const payment = await storage.getPayment(paymentId);
      if (!payment || payment.userId !== userId) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // In production, verify payment with Cryptomus API
      // For demo, simulate successful payment
      const isPaymentConfirmed = Math.random() > 0.3; // 70% success rate for demo

      if (isPaymentConfirmed) {
        // Update payment status
        await storage.updatePayment(paymentId, {
          providerStatus: 'success',
          confirmedAt: new Date(),
        });

        // Add coins to user balance
        const user = await storage.updateUserCoins(userId, payment.coinsAdded);

        // Create transaction record
        await storage.createTransaction({
          userId,
          type: 'buy_coins',
          amount: payment.coinsAdded,
          reason: `Purchased ${payment.coinsAdded} coins via Cryptomus`,
          paymentRef: paymentId,
        });

        // Broadcast balance update via WebSocket
        broadcastDatabaseChange(
          'transaction_created',
          { userId, amount: payment.coinsAdded, newBalance: user.coinsBalance },
          userId
        );

        res.json({ status: 'completed', coinsAdded: payment.coinsAdded });
      } else {
        res.json({ status: 'pending', message: 'Payment not yet confirmed on blockchain' });
      }
    } catch (error) {
      console.error('Cryptomus payment confirmation error:', error);
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
  });

  app.post('/api/payments/webhook', async (req, res) => {
    try {
      // In a real implementation, verify the webhook signature
      const { type, data } = req.body;
      
      if (type === 'payment_intent.succeeded') {
        const paymentIntent = data.object;
        const { userId, coins } = paymentIntent.metadata;

        // Update payment status
        const payments = await storage.getAllVideos(); // This would need a payment lookup method
        // Find and update payment...

        // Add coins to user
        const updatedUser = await storage.updateUserCoins(userId, parseInt(coins));

        // Emit real-time balance update
        io.to(`user_${userId}`).emit('balance_updated', { 
          newBalance: updatedUser.coinsBalance,
          change: parseInt(coins),
          reason: 'Stripe payment'
        });

        // Create transaction
        await storage.createTransaction({
          userId,
          type: "buy_coins",
          amount: parseInt(coins),
          paymentRef: paymentIntent.id,
          details: { provider: "stripe" },
        });
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ message: "Webhook error" });
    }
  });

  // Admin payment configuration routes
  // Payment providers management routes
  app.get('/api/payment-providers', async (req: any, res) => {
    try {
      const providers = await storage.getAllPaymentProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching payment providers:", error);
      res.status(500).json({ message: "Failed to fetch payment providers" });
    }
  });

  app.get('/api/payment-providers/enabled', async (req: any, res) => {
    try {
      const providers = await storage.getEnabledPaymentProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching enabled payment providers:", error);
      res.status(500).json({ message: "Failed to fetch enabled payment providers" });
    }
  });

  app.get('/api/admin/payment-providers', requireAdminAuth, async (req: any, res) => {
    try {
      const providers = await storage.getAllPaymentProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching payment providers:", error);
      res.status(500).json({ message: "Failed to fetch payment providers" });
    }
  });

  app.put('/api/admin/payment-providers/:provider', requireAdminAuth, async (req: any, res) => {
    try {
      const { provider } = req.params;
      const updates = req.body;

      const updatedProvider = await storage.updatePaymentProvider(provider, updates);
      res.json(updatedProvider);
    } catch (error) {
      console.error("Error updating payment provider:", error);
      res.status(500).json({ message: "Failed to update payment provider" });
    }
  });

  app.put('/api/admin/payment-providers/:provider/enabled', requireAdminAuth, async (req: any, res) => {
    try {
      const { provider } = req.params;
      const { enabled } = req.body;

      const updatedProvider = await storage.setPaymentProviderEnabled(provider, enabled);
      res.json(updatedProvider);
    } catch (error) {
      console.error("Error updating payment provider status:", error);
      res.status(500).json({ message: "Failed to update payment provider status" });
    }
  });

  // Video reporting and flagging routes
  app.post('/api/videos/:id/report', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const videoId = req.params.id;
      const { reason } = req.body;

      // Check if user has already reported this video
      const existingReport = await storage.getUserVideoReport(userId, videoId);
      if (existingReport) {
        return res.status(400).json({ message: "You have already reported this video" });
      }

      // Create video report
      const report = await storage.createVideoReport({
        videoId,
        reporterId: userId,
        reason: reason || "Inappropriate content",
        status: "pending"
      });

      // Update video report count
      const video = await storage.getVideo(videoId);
      if (video) {
        const newReportCount = (video.reportCount || 0) + 1;
        
        // Auto-flag if multiple reports (threshold: 3 reports)
        if (newReportCount >= 3) {
          await storage.updateVideo(videoId, {
            status: "flagged",
            reportCount: newReportCount,
            flaggedAt: new Date()
          });

          // Notify video owner
          await storage.createNotification({
            userId: video.userId,
            title: "Video Flagged",
            message: `Your video has been flagged and paused pending admin review. Order ID: ${video.orderId}`,
            type: "video_flagged",
            priority: "normal",
            isRead: false,
          });
        } else {
          await storage.updateVideo(videoId, { reportCount: newReportCount });
        }
      }

      res.json({ success: true, message: "Video reported successfully" });
    } catch (error: any) {
      console.error("Error reporting video:", error);
      res.status(500).json({ message: "Failed to report video" });
    }
  });

  // User tasks routes (for tracking submissions)
  app.get('/api/user/tasks', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userVideos = await storage.getVideos({ userId });

      // Transform videos to task format
      const tasks = userVideos.map(video => ({
        id: video.id,
        orderId: video.orderId,
        title: video.title,
        totalWatches: video.requestedWatches,
        completedWatches: video.completedWatches || 0,
        status: video.status === "completed" ? "Completed" : 
                video.status === "flagged" ? "Flagged" : 
                video.status === "paused" ? "Paused" : "Active",
        createdAt: video.createdAt,
        completedAt: video.completedAt
      }));

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Enhanced watch completion with automatic campaign completion detection
  app.post('/api/watch/complete-enhanced', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId, watchSeconds, sessionData } = req.body;

      const job = await storage.completeWatchJob(jobId);
      if (job.assignedToUserId !== userId) {
        return res.status(403).json({ message: "Job not assigned to you" });
      }

      const video = await storage.getVideo(job.videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Update completed watches count
      const newCompletedWatches = (video.completedWatches || 0) + 1;
      
      // Check if campaign is completed
      if (newCompletedWatches >= video.requestedWatches) {
        await storage.updateVideo(video.id, {
          completedWatches: newCompletedWatches,
          status: "completed",
          completedAt: new Date()
        });

        // Notify video owner of completion
        await storage.createNotification({
          userId: video.userId,
          title: "Campaign Completed!",
          message: `Your submission (Order ID: ${video.orderId}) has completed successfully!`,
          type: "campaign_completed",
          priority: "normal",
          isRead: false,
        });
      } else {
        await storage.updateVideo(video.id, { completedWatches: newCompletedWatches });
      }

      // Create watch history record
      await storage.createWatchHistory({
        watcherId: userId,
        videoId: video.id,
        watchSeconds: Math.min(watchSeconds, job.watchSecondsRequired),
        coinsEarned: job.watchSecondsRequired,
        clientSession: sessionData?.session,
        ipAddress: req.ip,
        deviceInfo: sessionData?.device,
      });

      // Award coins to watcher
      await storage.updateUserCoins(userId, job.watchSecondsRequired);

      // Create transaction
      await storage.createTransaction({
        userId,
        type: "earn_watch",
        amount: job.watchSecondsRequired,
        reason: `Watched video "${video.title}" for ${watchSeconds}s`,
        details: { videoId: video.id, watchSeconds },
      });

      res.json({ success: true, coinsEarned: job.watchSecondsRequired });
    } catch (error: any) {
      console.error("Error completing enhanced watch:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Referral routes
  app.get('/api/referrals', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const referrals = await storage.getReferralsByUser(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/referrals/code', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ referralCode: user.referralCode });
    } catch (error) {
      console.error("Error fetching referral code:", error);
      res.status(500).json({ message: "Failed to fetch referral code" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdminAuth, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin profile endpoint
  app.get('/api/admin/me', requireAdminAuth, async (req: any, res) => {
    try {
      const adminId = req.session?.adminId || 'admin';
      // For now, return a mock admin profile since we're using basic auth
      res.json({
        id: adminId,
        email: 'admin@y2big.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40'
      });
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ message: "Failed to fetch admin profile" });
    }
  });

  // Admin notifications endpoint
  app.get('/api/admin/notifications', requireAdminAuth, async (req: any, res) => {
    try {
      // Return admin-specific notifications
      res.json([]);
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      res.status(500).json({ message: "Failed to fetch admin notifications" });
    }
  });

  // Pending reports endpoint
  app.get('/api/admin/reports/pending', requireAdminAuth, async (req: any, res) => {
    try {
      const reports = await storage.getAllVideoReports();
      const pendingReports = reports.filter(report => report.status === 'pending');
      res.json(pendingReports);
    } catch (error) {
      console.error("Error fetching pending reports:", error);
      res.status(500).json({ message: "Failed to fetch pending reports" });
    }
  });

  // Update user role endpoint
  app.patch('/api/admin/users/:userId/role', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Validate role
      if (!['user', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }

      await storage.updateUserRole(userId, role);
      res.json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Update user status endpoint
  app.patch('/api/admin/users/:userId/status', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      // Validate status
      if (!['active', 'banned', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status specified' });
      }

      await storage.updateUserStatus(userId, status);
      res.json({ success: true, message: 'User status updated successfully' });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Update user profile endpoint (admin)
  app.put('/api/admin/users/:userId', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Validate role if provided
      if (updates.role && !['user', 'moderator', 'admin'].includes(updates.role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }

      // Validate status if provided
      if (updates.status && !['active', 'banned', 'suspended'].includes(updates.status)) {
        return res.status(400).json({ message: 'Invalid status specified' });
      }

      // Ensure coinsBalance is a number if provided
      if (updates.coinsBalance !== undefined) {
        updates.coinsBalance = Number(updates.coinsBalance);
        if (isNaN(updates.coinsBalance) || updates.coinsBalance < 0) {
          return res.status(400).json({ message: 'Invalid coins balance' });
        }
      }

      const updatedUser = await storage.updateUserProfile(userId, updates);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Create admin/moderator endpoint
  app.post('/api/admin/create-admin', requireAdminAuth, async (req: any, res) => {
    try {
      const { email, role } = req.body;

      // Validate role
      if (!['moderator', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }

      // Check if user with email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Update existing user's role
        await storage.updateUserRole(existingUser.id, role);
        res.json({ success: true, message: `Existing user promoted to ${role}` });
      } else {
        // Create new user account
        const newUser = await storage.createUser({
          email,
          role,
          status: 'active',
          coinsBalance: 0,
          welcomeBonusReceived: true
        });
        res.json({ success: true, message: `New ${role} account created`, user: newUser });
      }
    } catch (error) {
      console.error("Error creating admin account:", error);
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  app.get('/api/admin/videos', requireAdminAuth, async (req: any, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching admin videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get('/api/admin/stats', requireAdminAuth, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post('/api/admin/users/:id/adjust-coins', requireAdminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const updatedUser = await storage.updateUserCoins(id, amount);

      // Emit real-time balance update
      io.to(`user_${id}`).emit('balance_updated', { 
        newBalance: updatedUser.coinsBalance,
        change: amount,
        reason: 'Admin adjustment'
      });
      
      await storage.createTransaction({
        userId: id,
        type: "manual_adjustment",
        amount,
        reason: reason || (amount > 0 ? `Manual deposit added by admin` : `Manual adjustment by admin`),
        details: { reason, adjustedBy: req.session.adminId || 'admin' },
      });

      // Create notification for coin adjustment
      await storage.createNotification({
        userId: id,
        title: amount > 0 ? "Coins Added!" : "Account Adjusted",
        message: amount > 0 
          ? `${amount} coins have been added to your account by admin.` 
          : `Your account has been adjusted by admin: ${reason}`,
        type: "adjustment",
        priority: "normal",
        isRead: false,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error adjusting coins:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/admin/users/:id/status', requireAuth, async (req: any, res) => {
    try {
      // For demo purposes, make any authenticated user admin
      // In production, you'd check specific roles or user IDs

      const { id } = req.params;
      const { status } = req.body;

      await storage.updateUserStatus(id, status);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user status:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Enhanced admin video management routes
  app.post('/api/admin/videos/:id/approve', requireAuth, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      await storage.updateVideo(videoId, { status: "active" });
      res.json({ success: true, message: "Video approved successfully" });
    } catch (error: any) {
      console.error("Error approving video:", error);
      res.status(500).json({ message: "Failed to approve video" });
    }
  });

  app.post('/api/admin/videos/:id/pause', requireAuth, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      await storage.updateVideo(videoId, { status: "paused" });
      res.json({ success: true, message: "Video paused successfully" });
    } catch (error: any) {
      console.error("Error pausing video:", error);
      res.status(500).json({ message: "Failed to pause video" });
    }
  });

  app.delete('/api/admin/videos/:id', requireAuth, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      await storage.updateVideo(videoId, { status: "removed" });
      res.json({ success: true, message: "Video removed successfully" });
    } catch (error: any) {
      console.error("Error removing video:", error);
      res.status(500).json({ message: "Failed to remove video" });
    }
  });

  // Flagged content management routes
  app.get('/api/admin/flagged-videos', requireAdminAuth, async (req: any, res) => {
    try {
      const flaggedVideos = await storage.getVideos({ status: "flagged" });
      
      // Get reports for each flagged video
      const videosWithReports = await Promise.all(
        flaggedVideos.map(async (video) => {
          const reports = await storage.getVideoReports(video.id);
          return { ...video, reports };
        })
      );

      res.json(videosWithReports);
    } catch (error: any) {
      console.error("Error fetching flagged videos:", error);
      res.status(500).json({ message: "Failed to fetch flagged videos" });
    }
  });

  app.post('/api/admin/flagged-videos/:id/resolve', requireAdminAuth, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      const { action, reason } = req.body; // action: 'approve' | 'remove'

      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (action === 'approve') {
        await storage.updateVideo(videoId, { 
          status: "active", 
          flaggedAt: null,
          reportCount: 0 
        });
        
        // Notify video owner
        await storage.createNotification({
          userId: video.userId,
          title: "Video Approved",
          message: `Your video has been reviewed and approved. Order ID: ${video.orderId}`,
          type: "video_approved",
          priority: "normal",
          isRead: false,
        });
      } else if (action === 'remove') {
        await storage.updateVideo(videoId, { status: "removed" });
        
        // Notify video owner
        await storage.createNotification({
          userId: video.userId,
          title: "Video Removed",
          message: `Your video has been removed after review. Order ID: ${video.orderId}. Reason: ${reason || 'Policy violation'}`,
          type: "video_removed",
          priority: "high",
          isRead: false,
        });
      }

      // Update all related reports as reviewed
      await storage.updateVideoReportsStatus(videoId, "reviewed");

      res.json({ success: true, message: `Video ${action}d successfully` });
    } catch (error: any) {
      console.error("Error resolving flagged video:", error);
      res.status(500).json({ message: "Failed to resolve flagged video" });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/mark-all-read', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.post('/api/admin/notifications/broadcast', requireAdminAuth, async (req: any, res) => {
    try {
      const { title, message, type } = req.body;
      
      const allUsers = await storage.getAllUsers();
      
      // Create notification for each user
      await Promise.all(
        allUsers.map(user => 
          storage.createNotification({
            userId: user.id,
            title,
            message,
            type,
            isRead: false,
          })
        )
      );

      res.json({ success: true, sentTo: allUsers.length });
    } catch (error) {
      console.error("Error broadcasting notification:", error);
      res.status(500).json({ message: "Failed to broadcast notification" });
    }
  });

  app.post('/api/admin/notifications/send', requireAdminAuth, async (req: any, res) => {
    try {
      const { userId, title, message, type } = req.body;
      
      await storage.createNotification({
        userId,
        title,
        message,
        type,
        isRead: false,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Video reporting endpoints
  app.post('/api/videos/:id/report', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const videoId = req.params.id;
      const { reason } = req.body;

      // Create video report
      const report = await storage.createVideoReport({
        videoId,
        reporterId: userId,
        reason: reason || 'Inappropriate content',
        status: 'pending'
      });

      // Increment report count on video
      const video = await storage.getVideo(videoId);
      if (video) {
        const newReportCount = (video.reportCount || 0) + 1;
        await storage.updateVideo(videoId, { 
          reportCount: newReportCount,
          flaggedAt: newReportCount >= 3 ? new Date() : video.flaggedAt, // Flag after 3 reports
          status: newReportCount >= 3 ? 'flagged' : video.status
        });
      }

      res.json({ success: true, report });
    } catch (error: any) {
      console.error("Error reporting video:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Admin reports management
  app.get('/api/admin/reports', requireAdminAuth, async (req: any, res) => {
    try {
      const reports = await storage.getAllVideoReports();
      
      // Get video and reporter details for each report
      const reportsWithDetails = await Promise.all(
        reports.map(async (report) => {
          const video = await storage.getVideo(report.videoId);
          const reporter = await storage.getUser(report.reporterId);
          return { 
            ...report, 
            video, 
            reporter: { id: reporter?.id, email: reporter?.email }
          };
        })
      );

      res.json(reportsWithDetails);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Admin settings management routes
  app.get('/api/admin/settings', requireAdminAuth, async (req: any, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/admin/settings', requireAdminAuth, async (req: any, res) => {
    try {
      const settingData = insertSystemSettingSchema.parse(req.body);
      const setting = await storage.setSystemSetting(settingData);
      
      // Broadcast admin settings update in real-time
      broadcastDatabaseChange('admin_settings_updated', { 
        key: setting.key, 
        value: setting.value,
        description: setting.description 
      });
      
      res.json(setting);
    } catch (error: any) {
      console.error("Error creating admin setting:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put('/api/admin/settings/:key', requireAdminAuth, async (req: any, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      const setting = await storage.setSystemSetting({ key, value, description });
      
      // Broadcast admin settings update in real-time
      broadcastDatabaseChange('admin_settings_updated', { 
        key: setting.key, 
        value: setting.value,
        description: setting.description 
      });
      
      res.json(setting);
    } catch (error: any) {
      console.error("Error updating admin setting:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/admin/settings/:key', requireAdminAuth, async (req: any, res) => {
    try {
      const { key } = req.params;
      await storage.deleteSystemSetting(key);
      res.json({ success: true, message: 'Setting deleted successfully' });
    } catch (error: any) {
      console.error("Error deleting admin setting:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Website configuration routes
  app.get('/api/admin/website-config', requireAdminAuth, async (req: any, res) => {
    try {
      const config = await storage.getWebsiteConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching website config:", error);
      res.status(500).json({ message: "Failed to fetch website config" });
    }
  });

  app.put('/api/admin/website-config', requireAdminAuth, async (req: any, res) => {
    try {
      const updates = req.body;
      const updatedConfig = await storage.updateWebsiteConfig(updates);
      
      // Broadcast website config update in real-time
      broadcastDatabaseChange('website_config_updated', updatedConfig);
      
      res.json(updatedConfig);
    } catch (error: any) {
      console.error("Error updating website config:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Public route to get maintenance mode status
  app.get('/api/website-config/maintenance', async (req: any, res) => {
    try {
      const config = await storage.getWebsiteConfig();
      res.json({ 
        maintenanceMode: config?.maintenanceMode || false,
        maintenanceMessage: config?.maintenanceMessage || null,
        siteName: config?.siteName || 'Y2Big'
      });
    } catch (error) {
      console.error("Error fetching maintenance status:", error);
      res.status(500).json({ message: "Failed to fetch maintenance status" });
    }
  });

  // Ban appeal endpoint
  app.post('/api/user/ban-appeal', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { message } = req.body;

      // Create notification for admin about ban appeal
      await storage.createNotification({
        userId: 'admin', // Special admin notification
        title: "Ban Appeal Received",
        message: `User ${userId} submitted a ban appeal: ${message}`,
        type: "ban_appeal",
        priority: "high",
        isRead: false,
      });

      res.json({ success: true, message: "Appeal submitted successfully" });
    } catch (error: any) {
      console.error("Error submitting ban appeal:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Profile update route
  app.put('/api/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const {
        firstName,
        lastName,
        phoneNumber,
        countryCode,
        country,
        profileImageUrl
      } = req.body;

      // Update user profile in storage
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        phoneNumber,
        countryCode,
        country,
        profileImageUrl
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        success: true,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // System settings routes for admin
  app.get('/api/admin/settings', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.post('/api/admin/settings', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const settingData = insertSystemSettingSchema.parse(req.body);
      const setting = await storage.setSystemSetting(settingData);
      res.json(setting);
    } catch (error: any) {
      console.error("Error updating system setting:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/admin/settings/:key', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      await storage.deleteSystemSetting(req.params.key);
      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      console.error("Error deleting system setting:", error);
      res.status(500).json({ message: "Failed to delete system setting" });
    }
  });

  // YouTube API integration routes
  app.get('/api/youtube/watch/:videoId', requireAuth, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Create YouTube embed URL with disabled controls and no autoplay initially
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0`;
      const directUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Return session data for authenticated user
      res.json({
        embedUrl,
        directUrl,
        videoId,
        requireAuth: true,
        userName: user.firstName || user.email,
        sessionValid: true
      });
      
    } catch (error) {
      console.error('YouTube session error:', error);
      res.status(500).json({ message: "Failed to create YouTube session" });
    }
  });

  // YouTube video metadata endpoint
  app.get('/api/youtube/video/:videoId', requireAuth, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      
      // Get YouTube API key from system settings
      const youtubeApiKey = await storage.getSystemSetting('youtube_api_key');
      if (!youtubeApiKey?.value) {
        return res.status(503).json({ message: "YouTube API not configured" });
      }

      // Fetch video metadata from YouTube API
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics&key=${youtubeApiKey.value}`;
      const response = await fetch(apiUrl);
      const data: any = await response.json();

      if (!data.items || data.items.length === 0) {
        return res.status(404).json({ message: "Video not found" });
      }

      const video = data.items[0];
      const videoData = {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        thumbnails: video.snippet.thumbnails,
        viewCount: parseInt(video.statistics.viewCount || 0),
        likeCount: parseInt(video.statistics.likeCount || 0),
        commentCount: parseInt(video.statistics.commentCount || 0)
      };

      res.json(videoData);
      
    } catch (error) {
      console.error('YouTube API error:', error);
      res.status(500).json({ message: "Failed to fetch video data" });
    }
  });

  // YouTube like integration endpoint
  app.post('/api/youtube/like', requireAuth, async (req: any, res) => {
    try {
      const { videoId } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check if user has Google OAuth token for YouTube operations
      if (!user.googleAccessToken) {
        return res.status(403).json({ 
          message: "YouTube integration requires Google authentication. Please reconnect your Google account." 
        });
      }

      // Attempt to like the video via YouTube API
      try {
        const likeUrl = `https://www.googleapis.com/youtube/v3/videos/rate?id=${videoId}&rating=like`;
        const likeResponse = await fetch(likeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.googleAccessToken}`,
            'Content-Type': 'application/json',
          }
        });

        let youtubeSuccess = false;
        if (likeResponse.ok) {
          youtubeSuccess = true;
        } else {
          console.warn('YouTube like failed, but continuing with local recording:', await likeResponse.text());
        }

        // Always award bonus coins for engagement, regardless of YouTube API success
        const bonusCoins = 5;
        await storage.updateUserCoins(userId, bonusCoins);

        // Create transaction record
        await storage.createTransaction({
          userId,
          type: "like_bonus",
          amount: bonusCoins,
          reason: `Liked video ${videoId}${youtubeSuccess ? ' (synced to YouTube)' : ' (local only)'}`,
          details: { videoId, youtubeSuccess },
        });

        // Broadcast balance update via WebSocket
        const updatedUser = await storage.getUser(userId);
        broadcastDatabaseChange(
          'balance_updated',
          { 
            newBalance: updatedUser?.coinsBalance || 0,
            change: bonusCoins,
            reason: 'Video like bonus'
          },
          userId
        );

        res.json({ 
          success: true, 
          bonusCoins, 
          youtubeSuccess,
          message: youtubeSuccess 
            ? "Like recorded on YouTube and bonus coins awarded!" 
            : "Bonus coins awarded! YouTube sync may retry later."
        });

      } catch (apiError) {
        console.error('YouTube API error:', apiError);
        
        // Still award local bonus even if YouTube API fails
        const bonusCoins = 5;
        await storage.updateUserCoins(userId, bonusCoins);

        await storage.createTransaction({
          userId,
          type: "like_bonus",
          amount: bonusCoins,
          reason: `Liked video ${videoId} (local recording only)`,
          details: { videoId, youtubeSuccess: false },
        });

        res.json({ 
          success: true, 
          bonusCoins, 
          youtubeSuccess: false,
          message: "Bonus coins awarded! YouTube integration temporarily unavailable."
        });
      }
      
    } catch (error) {
      console.error('Like video error:', error);
      res.status(500).json({ message: "Failed to process video like" });
    }
  });

  // Enhanced watch completion endpoint
  app.post('/api/watch/complete', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId, watchSeconds, sessionData } = req.body;

      // Get the watch job by completing it first
      const job = await storage.completeWatchJob(jobId);
      if (!job || job.assignedToUserId !== userId) {
        return res.status(403).json({ message: "Invalid or unauthorized watch job" });
      }

      // Complete the job
      await storage.completeWatchJob(jobId);

      // Get video details
      const video = await storage.getVideo(job.videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Update completed watches count
      const newCompletedWatches = (video.completedWatches || 0) + 1;
      
      // Check if campaign is completed
      if (newCompletedWatches >= video.requestedWatches) {
        await storage.updateVideo(video.id, {
          completedWatches: newCompletedWatches,
          status: "completed",
          completedAt: new Date()
        });

        // Notify video owner of completion
        await storage.createNotification({
          userId: video.userId,
          title: "Campaign Completed!",
          message: `Your video "${video.title}" has reached its watch goal!`,
          type: "campaign_completed",
          priority: "normal",
          isRead: false,
        });
      } else {
        await storage.updateVideo(video.id, { completedWatches: newCompletedWatches });
      }

      // Create watch history record
      await storage.createWatchHistory({
        watcherId: userId,
        videoId: video.id,
        watchSeconds: Math.min(watchSeconds, job.watchSecondsRequired),
        coinsEarned: job.watchSecondsRequired,
        clientSession: sessionData?.session || 'web',
        ipAddress: req.ip,
        deviceInfo: sessionData?.device || 'unknown',
      });

      // Award coins to watcher
      const updatedUser = await storage.updateUserCoins(userId, job.watchSecondsRequired);

      // Create transaction
      await storage.createTransaction({
        userId,
        type: "earn_watch",
        amount: job.watchSecondsRequired,
        reason: `Watched "${video.title}" for ${watchSeconds}s`,
        details: { videoId: video.id, watchSeconds, jobId },
      });

      // Broadcast balance update via WebSocket
      broadcastDatabaseChange(
        'balance_updated',
        { 
          newBalance: updatedUser.coinsBalance,
          change: job.watchSecondsRequired,
          reason: 'Video watch completion'
        },
        userId
      );

      res.json({ 
        success: true, 
        coinsEarned: job.watchSecondsRequired,
        campaignCompleted: newCompletedWatches >= video.requestedWatches
      });

    } catch (error: any) {
      console.error("Error completing watch:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Native YouTube Session Routes for authenticated experience
  app.post('/api/youtube/session', requireAuth, async (req: any, res) => {
    try {
      const { videoId } = req.body;
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Create authenticated YouTube session with user's Google OAuth
      const sessionUrl = `https://www.youtube.com/embed/${videoId}?` + new URLSearchParams({
        autoplay: '1',
        controls: '1',
        modestbranding: '0',
        rel: '1',
        showinfo: '1',
        iv_load_policy: '1',
        cc_load_policy: '1',
        fs: '1',
        disablekb: '0',
        playsinline: '0',
        enablejsapi: '1',
        origin: req.get('origin') || 'localhost:5000',
        ad_tag: '1',
        adsystem: 'youtube',
        html5: '1',
        vq: 'auto'
      }).toString();
      
      res.json({
        sessionUrl,
        isAuthenticated: true,
        userName: user.username || user.email,
        hasAccess: true,
        allowAds: true,
        fullYouTubeExperience: true
      });
      
    } catch (error) {
      console.error('Error creating YouTube session:', error);
      res.status(500).json({ error: 'Failed to create YouTube session' });
    }
  });

  // Enhanced YouTube interaction endpoints using authenticated sessions
  app.post('/api/youtube/like', requireAuth, async (req: any, res) => {
    try {
      const { videoId } = req.body;
      const user = req.user;
      
      if (!user?.google_access_token) {
        // Award bonus coins even without YouTube sync
        const bonusCoins = 5;
        await storage.updateUserCoins(user.id, bonusCoins);
        
        await storage.createTransaction({
          userId: user.id,
          type: "like_bonus",
          amount: bonusCoins,
          reason: `Liked video ${videoId}`,
          details: { videoId, action: 'like' },
        });

        return res.json({ 
          success: true, 
          bonusCoins, 
          message: "Like recorded and bonus coins awarded!" 
        });
      }

      // Use Google API to actually like the video on YouTube
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${videoId}&rating=like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.google_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const bonusCoins = 5;
      await storage.updateUserCoins(user.id, bonusCoins);
      
      await storage.createTransaction({
        userId: user.id,
        type: "like_bonus", 
        amount: bonusCoins,
        reason: `Liked video ${videoId} on YouTube`,
        details: { videoId, youtubeSync: response.ok },
      });

      res.json({ 
        success: true, 
        bonusCoins,
        youtubeSync: response.ok,
        message: response.ok ? "Video liked on YouTube!" : "Like recorded locally"
      });
      
    } catch (error) {
      console.error('Error liking video:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/youtube/dislike', requireAuth, async (req: any, res) => {
    try {
      const { videoId } = req.body;
      const user = req.user;
      
      if (!user?.google_access_token) {
        return res.json({ success: true, message: "Dislike recorded locally" });
      }

      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${videoId}&rating=dislike`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.google_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      res.json({ 
        success: true,
        youtubeSync: response.ok,
        message: response.ok ? "Video disliked on YouTube" : "Dislike recorded locally"
      });
      
    } catch (error) {
      console.error('Error disliking video:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/youtube/subscribe', requireAuth, async (req: any, res) => {
    try {
      const { channelId } = req.body;
      const user = req.user;
      
      if (!user?.google_access_token) {
        return res.json({ success: true, message: "Subscription recorded locally" });
      }

      const response = await fetch('https://www.googleapis.com/youtube/v3/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.google_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            resourceId: {
              kind: 'youtube#channel',
              channelId: channelId
            }
          }
        })
      });

      res.json({ 
        success: true,
        youtubeSync: response.ok,
        message: response.ok ? "Subscribed on YouTube!" : "Subscription recorded locally"
      });
      
    } catch (error) {
      console.error('Error subscribing:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/youtube/unsubscribe', requireAuth, async (req: any, res) => {
    try {
      const { channelId } = req.body;
      const user = req.user;
      
      if (!user?.google_access_token) {
        return res.json({ success: true, message: "Unsubscription recorded locally" });
      }

      // First get subscription ID
      const listResponse = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&forChannelId=${channelId}`, {
        headers: {
          'Authorization': `Bearer ${user.google_access_token}`
        }
      });

      const subscriptions = await listResponse.json();
      
      if (subscriptions.items && subscriptions.items.length > 0) {
        const subscriptionId = subscriptions.items[0].id;
        
        const deleteResponse = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?id=${subscriptionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.google_access_token}`
          }
        });

        res.json({ 
          success: true,
          youtubeSync: deleteResponse.ok,
          message: deleteResponse.ok ? "Unsubscribed on YouTube" : "Unsubscription recorded locally"
        });
      } else {
        res.json({ success: true, message: "Not subscribed" });
      }
      
    } catch (error) {
      console.error('Error unsubscribing:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update video metadata endpoint
  app.patch('/api/videos/:videoId/metadata', async (req, res) => {
    try {
      const { videoId } = req.params;
      const updateData = req.body;
      
      console.log(`Updating metadata for video ${videoId}:`, updateData);
      
      // Update video with new metadata
      await storage.updateVideo(videoId, updateData);
      
      console.log(`✅ Successfully updated video ${videoId} metadata`);
      res.json({ message: 'Video metadata updated successfully' });
      
    } catch (error) {
      console.error('Error updating video metadata:', error);
      res.status(500).json({ message: 'Failed to update video metadata' });
    }
  });

  return server;
}
