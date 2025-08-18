import {
  users,
  videos,
  watchJobs,
  watchHistory,
  transactions,
  payments,
  boosts,
  referrals,
  videoReports,
  userVideoViews,
  systemSettings,
  paymentProviders,
  websiteConfig,
  type User,
  type UpsertUser,
  type Video,
  type InsertVideo,
  type WatchJob,
  type InsertWatchJob,
  type WatchHistory,
  type InsertWatchHistory,
  type Transaction,
  type InsertTransaction,
  type Payment,
  type InsertPayment,
  type Boost,
  type InsertBoost,
  type Referral,
  type InsertReferral,
  type VideoReport,
  type InsertVideoReport,
  type UserVideoView,
  type InsertUserVideoView,
  type SystemSetting,
  type InsertSystemSetting,
  type PaymentProvider,
  type InsertPaymentProvider,
  type WebsiteConfig,
  insertWebsiteConfigSchema,
} from "@shared/schema";
import { notifications, type Notification, type InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCoins(userId: string, amount: number): Promise<User>;
  updateUserBalance(userId: string, amount: number, type: 'earn' | 'spend', reason: string): Promise<void>;
  updateUserStatus(userId: string, status: string): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  
  // Video operations
  createVideo(video: InsertVideo): Promise<Video>;
  getVideos(filters?: { status?: string; userId?: string }): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video>;
  getAllVideos(): Promise<Video[]>;
  
  // Watch job operations
  createWatchJobs(jobs: InsertWatchJob[]): Promise<WatchJob[]>;
  getAvailableWatchJobs(limit?: number): Promise<WatchJob[]>;
  assignWatchJob(jobId: string, userId: string): Promise<WatchJob>;
  completeWatchJob(jobId: string): Promise<WatchJob>;
  
  // Watch history operations
  createWatchHistory(history: InsertWatchHistory): Promise<WatchHistory>;
  getWatchHistoryByUser(userId: string): Promise<WatchHistory[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;
  
  // Boost operations
  createBoost(boost: InsertBoost): Promise<Boost>;
  
  // Referral operations
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByUser(userId: string): Promise<Referral[]>;

  // Video reporting operations
  createVideoReport(report: InsertVideoReport): Promise<VideoReport>;
  getUserVideoReport(userId: string, videoId: string): Promise<VideoReport | undefined>;
  getVideoReports(videoId: string): Promise<VideoReport[]>;
  getAllVideoReports(): Promise<VideoReport[]>;
  updateVideoReportsStatus(videoId: string, status: string): Promise<void>;

  // User video views tracking
  createUserVideoView(view: InsertUserVideoView): Promise<UserVideoView>;
  getUserVideoView(userId: string, videoId: string): Promise<UserVideoView | undefined>;

  // Admin operations
  getAdminStats(): Promise<{
    totalUsers: number;
    activeVideos: number;
    totalTransactions: number;
    totalRevenue: number;
  }>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // System settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  deleteSystemSetting(key: string): Promise<void>;

  // Payment provider operations
  getAllPaymentProviders(): Promise<PaymentProvider[]>;
  getEnabledPaymentProviders(): Promise<PaymentProvider[]>;
  createPaymentProvider(data: Partial<PaymentProvider>): Promise<PaymentProvider>;
  updatePaymentProvider(provider: string, updates: Partial<PaymentProvider>): Promise<PaymentProvider>;
  setPaymentProviderEnabled(provider: string, enabled: boolean): Promise<PaymentProvider>;

  // Website configuration operations
  getWebsiteConfig(): Promise<WebsiteConfig | undefined>;
  updateWebsiteConfig(config: Partial<WebsiteConfig>): Promise<WebsiteConfig>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUser(userData.id!);
    
    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    }
    
    // Create new user with welcome bonus
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        coinsBalance: userData.coinsBalance || 60,
        referralCode: userData.referralCode || this.generateReferralCode(),
        role: userData.role || "user",
        status: "active",
        welcomeBonusReceived: false, // Will be set to true after notification is created
      })
      .returning();
    
    // Create welcome bonus transaction
    await this.createTransaction({
      userId: newUser.id,
      type: "welcome_bonus",
      amount: newUser.coinsBalance || 60,
      reason: "Welcome bonus for joining platform",
      details: { message: "Welcome to YouTube Watch Exchange!" },
    });
    
    // Create welcome notification
    await this.createNotification({
      userId: newUser.id,
      title: "Welcome Bonus Received!",
      message: `Welcome to YouTube Watch Exchange! You've received ${newUser.coinsBalance} coins to get started. Use them to promote your videos and earn more by watching others!`,
      type: "welcome_bonus",
      priority: "high",
      isRead: false,
    });
    
    // Mark welcome bonus as received
    await db
      .update(users)
      .set({ welcomeBonusReceived: true })
      .where(eq(users.id, newUser.id));
    
    return { ...newUser, welcomeBonusReceived: true };
  }

  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async updateUserCoins(userId: string, amount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        coinsBalance: sql`${users.coinsBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserBalance(userId: string, amount: number, type: 'earn' | 'spend', reason: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update user balance
      await tx
        .update(users)
        .set({
          coinsBalance: type === 'earn' 
            ? sql`${users.coinsBalance} + ${amount}`
            : sql`${users.coinsBalance} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Create transaction record
      await tx.insert(transactions).values({
        userId,
        type: type === 'earn' ? 'earn_watch' : 'spend_coins',
        amount: type === 'earn' ? amount : -amount,
        reason,
        details: { engagementBonus: true },
      });
    });
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        email: userData.email!,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',
        status: userData.status || 'active',
        coinsBalance: userData.coinsBalance || 0,
        welcomeBonusReceived: userData.welcomeBonusReceived || false,
        referralCode: generateReferralCode(),
      })
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Video operations
  async createVideo(videoData: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(videoData).returning();
    return video;
  }

  private generateOrderId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `YTB-${timestamp.slice(-8)}-${random}`;
  }

  async getVideos(filters?: { status?: string; userId?: string }): Promise<Video[]> {
    if (filters?.status && filters?.userId) {
      return await db.select().from(videos).where(and(eq(videos.status, filters.status), eq(videos.userId, filters.userId))).orderBy(desc(videos.createdAt));
    } else if (filters?.status) {
      return await db.select().from(videos).where(eq(videos.status, filters.status)).orderBy(desc(videos.createdAt));
    } else if (filters?.userId) {
      return await db.select().from(videos).where(eq(videos.userId, filters.userId)).orderBy(desc(videos.createdAt));
    }
    
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video || undefined;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async getAllVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  // Watch job operations
  async createWatchJobs(jobsData: InsertWatchJob[]): Promise<WatchJob[]> {
    if (jobsData.length === 0) return [];
    return await db.insert(watchJobs).values(jobsData).returning();
  }

  async getAvailableWatchJobs(limit: number = 20): Promise<WatchJob[]> {
    return await db
      .select()
      .from(watchJobs)
      .where(eq(watchJobs.status, "available"))
      .orderBy(desc(watchJobs.createdAt))
      .limit(limit);
  }

  async assignWatchJob(jobId: string, userId: string): Promise<WatchJob> {
    const [job] = await db
      .update(watchJobs)
      .set({
        assignedToUserId: userId,
        status: "assigned",
        assignedAt: new Date(),
      })
      .where(eq(watchJobs.id, jobId))
      .returning();
    return job;
  }

  async completeWatchJob(jobId: string): Promise<WatchJob> {
    const [job] = await db
      .update(watchJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(watchJobs.id, jobId))
      .returning();
    return job;
  }

  // Watch history operations
  async createWatchHistory(historyData: InsertWatchHistory): Promise<WatchHistory> {
    const [history] = await db.insert(watchHistory).values(historyData).returning();
    return history;
  }

  async getWatchHistoryByUser(userId: string): Promise<WatchHistory[]> {
    return await db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.watcherId, userId))
      .orderBy(desc(watchHistory.createdAt));
  }

  // Transaction operations
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  // Boost operations
  async createBoost(boostData: InsertBoost): Promise<Boost> {
    const [boost] = await db.insert(boosts).values(boostData).returning();
    return boost;
  }

  // Referral operations
  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(referralData).returning();
    return referral;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user || undefined;
  }

  // Admin operations
  async getAdminStats(): Promise<{
    totalUsers: number;
    activeVideos: number;
    totalTransactions: number;
    totalRevenue: number;
  }> {
    // Using Promise.all to run queries in parallel
    const [userCount, videoCount, transactionCount, revenueResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(videos).where(eq(videos.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(transactions),
      db.select({ total: sql<number>`coalesce(sum(amount_usd), 0)` }).from(payments).where(eq(payments.providerStatus, "success"))
    ]);

    return {
      totalUsers: userCount[0]?.count || 0,
      activeVideos: videoCount[0]?.count || 0,
      totalTransactions: transactionCount[0]?.count || 0,
      totalRevenue: Number(revenueResult[0]?.total || 0),
    };
  }

  // Video reporting operations
  async createVideoReport(reportData: InsertVideoReport): Promise<VideoReport> {
    const [report] = await db.insert(videoReports).values(reportData).returning();
    return report;
  }

  async getUserVideoReport(userId: string, videoId: string): Promise<VideoReport | undefined> {
    const [report] = await db
      .select()
      .from(videoReports)
      .where(and(eq(videoReports.reporterId, userId), eq(videoReports.videoId, videoId)));
    return report || undefined;
  }

  async getVideoReports(videoId: string): Promise<VideoReport[]> {
    return await db
      .select()
      .from(videoReports)
      .where(eq(videoReports.videoId, videoId))
      .orderBy(desc(videoReports.createdAt));
  }

  async getAllVideoReports(): Promise<VideoReport[]> {
    return await db
      .select()
      .from(videoReports)
      .orderBy(desc(videoReports.createdAt));
  }

  async updateVideoReportsStatus(videoId: string, status: string): Promise<void> {
    await db
      .update(videoReports)
      .set({ status })
      .where(eq(videoReports.videoId, videoId));
  }

  // User video views tracking
  async createUserVideoView(viewData: InsertUserVideoView): Promise<UserVideoView> {
    const [view] = await db.insert(userVideoViews).values(viewData).returning();
    return view;
  }

  async getUserVideoView(userId: string, videoId: string): Promise<UserVideoView | undefined> {
    const [view] = await db
      .select()
      .from(userVideoViews)
      .where(and(eq(userVideoViews.userId, userId), eq(userVideoViews.videoId, videoId)));
    return view || undefined;
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      ...notificationData,
      id: crypto.randomUUID(),
    }).returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async setSystemSetting(settingData: InsertSystemSetting): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values(settingData)
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: settingData.value,
          description: settingData.description,
          category: settingData.category,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db
      .select()
      .from(systemSettings)
      .orderBy(systemSettings.category, systemSettings.key);
  }

  async deleteSystemSetting(key: string): Promise<void> {
    await db.delete(systemSettings).where(eq(systemSettings.key, key));
  }

  // Website configuration operations
  async getWebsiteConfig(): Promise<WebsiteConfig | undefined> {
    const [config] = await db.select().from(websiteConfig).limit(1);
    return config || undefined;
  }

  async updateWebsiteConfig(config: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    const existingConfig = await this.getWebsiteConfig();
    
    if (existingConfig) {
      const [updatedConfig] = await db
        .update(websiteConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(websiteConfig.id, existingConfig.id))
        .returning();
      return updatedConfig;
    } else {
      // Create new config if none exists
      const [newConfig] = await db
        .insert(websiteConfig)
        .values(config)
        .returning();
      return newConfig;
    }
  }

  // Payment provider operations
  async getAllPaymentProviders(): Promise<PaymentProvider[]> {
    return await db
      .select()
      .from(paymentProviders)
      .orderBy(paymentProviders.sortOrder, paymentProviders.displayName);
  }

  async getEnabledPaymentProviders(): Promise<PaymentProvider[]> {
    return await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.isEnabled, true))
      .orderBy(paymentProviders.sortOrder, paymentProviders.displayName);
  }

  async updatePaymentProvider(provider: string, updates: Partial<PaymentProvider>): Promise<PaymentProvider> {
    const [paymentProvider] = await db
      .update(paymentProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentProviders.provider, provider))
      .returning();
    return paymentProvider;
  }

  async createPaymentProvider(data: Partial<PaymentProvider>): Promise<PaymentProvider> {
    const [paymentProvider] = await db
      .insert(paymentProviders)
      .values({
        provider: data.provider!,
        displayName: data.displayName!,
        isEnabled: data.isEnabled ?? false,
        sortOrder: data.sortOrder ?? 0,
        apiSettings: data.apiSettings ?? {},
        uiConfig: data.uiConfig ?? {},
      })
      .returning();
    return paymentProvider;
  }

  async setPaymentProviderEnabled(provider: string, enabled: boolean): Promise<PaymentProvider> {
    return this.updatePaymentProvider(provider, { isEnabled: enabled });
  }
}

export class MemStorageWithReferrals implements IStorage {
  private users = new Map<string, User>();
  private videos = new Map<string, Video>();
  private watchJobs = new Map<string, WatchJob>();
  private watchHistory = new Map<string, WatchHistory>();
  private transactions = new Map<string, Transaction>();
  private payments = new Map<string, Payment>();
  private boosts = new Map<string, Boost>();
  private referrals = new Map<string, Referral>();
  private videoReports = new Map<string, VideoReport>();
  private userVideoViews = new Map<string, UserVideoView>();
  private notifications = new Map<string, Notification>();

  constructor() {
    // Create admin user for testing
    this.users.set("admin", {
      id: "admin",
      email: "admin@example.com", 
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
      phoneNumber: null,
      countryCode: null,
      country: null,
      role: "admin",
      status: "active",
      coinsBalance: 1000000,
      referralCode: "ADMIN",
      referredBy: null,
      welcomeBonusReceived: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    user.role = role;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(userData: any): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      phoneNumber: userData.phoneNumber || null,
      countryCode: userData.countryCode || null,
      country: userData.country || null,
      role: userData.role || "user",
      status: userData.status || "active",
      coinsBalance: userData.coinsBalance || 60,
      referralCode: userData.referralCode || generateReferralCode(),
      referredBy: userData.referredBy || null,
      welcomeBonusReceived: userData.welcomeBonusReceived || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    
    if (existingUser) {
      const updatedUser = { ...existingUser, ...userData, updatedAt: new Date() };
      this.users.set(userData.id!, updatedUser);
      return updatedUser;
    } else {
      // Generate referral code for new user
      let referralCode = userData.referralCode || generateReferralCode();
      
      // Ensure unique referral code
      let attempts = 0;
      while (attempts < 10) {
        const existing = Array.from(this.users.values()).find(u => u.referralCode === referralCode);
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      const newUser: User = {
        id: userData.id || crypto.randomUUID(),
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        phoneNumber: null,
        countryCode: null,
        country: null,
        role: userData.role || "user",
        status: "active",
        coinsBalance: 60, // Welcome bonus
        referralCode,
        referredBy: userData.referredBy || null,
        welcomeBonusReceived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Process referral bonus if user was referred
      if (userData.referredBy) {
        const referrer = await this.getUserByReferralCode(userData.referredBy);
        if (referrer && referrer.coinsBalance !== null) {
          // Give referrer 20 coins
          referrer.coinsBalance += 20;
          this.users.set(referrer.id, { ...referrer, updatedAt: new Date() });
          
          // Create referral record
          const referralId = crypto.randomUUID();
          const referralData: Referral = {
            id: referralId,
            referrerId: referrer.id,
            referredUserId: newUser.id,
            bonusEarned: 20,
            purchaseBonus: 0,
            status: "active",
            createdAt: new Date(),
          };
          this.referrals.set(referralId, referralData);

          // Create transaction for referrer
          const transactionId = crypto.randomUUID();
          const transaction: Transaction = {
            id: transactionId,
            userId: referrer.id,
            type: "referral_bonus",
            amount: 20,
            reason: "Referral bonus for inviting new user",
            paymentRef: null,
            details: { referredUserId: newUser.id },
            createdAt: new Date(),
          };
          this.transactions.set(transactionId, transaction);
        }
      }

      // Create welcome bonus transaction for new user
      const welcomeTxId = crypto.randomUUID();
      const welcomeTransaction: Transaction = {
        id: welcomeTxId,
        userId: newUser.id,
        type: "welcome_bonus",
        amount: 60,
        reason: "Welcome bonus for joining platform",
        paymentRef: null,
        details: { message: "Welcome to YouTube Watch Exchange!" },
        createdAt: new Date(),
      };
      this.transactions.set(welcomeTxId, welcomeTransaction);

      // Mark welcome bonus as received
      newUser.welcomeBonusReceived = true;
      this.users.set(newUser.id, newUser);
      return newUser;
    }
  }

  async updateUserCoins(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    user.coinsBalance = (user.coinsBalance || 0) + amount;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  async updateUserBalance(userId: string, amount: number, type: 'earn' | 'spend', reason: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    // Update user balance
    if (type === 'earn') {
      user.coinsBalance = (user.coinsBalance || 0) + amount;
    } else {
      user.coinsBalance = (user.coinsBalance || 0) - amount;
    }
    user.updatedAt = new Date();
    this.users.set(userId, user);

    // Create transaction record
    const transactionId = crypto.randomUUID();
    const transaction: Transaction = {
      id: transactionId,
      userId: userId,
      type: type === 'earn' ? 'earn' : 'spend',
      amount: amount,
      reason: reason,
      paymentRef: null,
      details: { engagementBonus: true },
      createdAt: new Date(),
    };
    this.transactions.set(transactionId, transaction);
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    user.status = status;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  async updateUserProfile(userId: string, updates: any): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { 
      ...user, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Video operations
  async createVideo(videoData: InsertVideo): Promise<Video> {
    const id = crypto.randomUUID();
    const video: Video = {
      id,
      userId: videoData.userId,
      youtubeId: videoData.youtubeId,
      title: videoData.title,
      thumbnailUrl: videoData.thumbnailUrl || null,
      durationSeconds: videoData.durationSeconds,
      requestedWatchSeconds: videoData.requestedWatchSeconds,
      requestedWatches: videoData.requestedWatches,
      coinsRequiredTotal: videoData.coinsRequiredTotal,
      coinsSpent: 0,
      boostLevel: videoData.boostLevel || 0,
      status: "active",
      orderId: videoData.orderId,
      completedWatches: 0,
      reportCount: 0,
      flaggedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async getVideos(filters?: { status?: string; userId?: string }): Promise<Video[]> {
    let results = Array.from(this.videos.values());
    
    if (filters?.status) {
      results = results.filter(v => v.status === filters.status);
    }
    if (filters?.userId) {
      results = results.filter(v => v.userId === filters.userId);
    }
    
    return results.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video> {
    const video = this.videos.get(id);
    if (!video) throw new Error("Video not found");
    
    const updatedVideo = { ...video, ...updates, updatedAt: new Date() };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  // Watch job operations
  async createWatchJobs(jobsData: InsertWatchJob[]): Promise<WatchJob[]> {
    if (jobsData.length === 0) return [];
    
    const jobs: WatchJob[] = jobsData.map(data => {
      const id = crypto.randomUUID();
      const job: WatchJob = {
        ...data,
        id,
        status: "available",
        assignedToUserId: null,
        assignedAt: null,
        completedAt: null,
        createdAt: new Date(),
      };
      this.watchJobs.set(id, job);
      return job;
    });
    
    return jobs;
  }

  async getAvailableWatchJobs(limit: number = 20): Promise<WatchJob[]> {
    const jobs = Array.from(this.watchJobs.values())
      .filter(job => job.status === "available")
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
    
    return jobs;
  }

  async assignWatchJob(jobId: string, userId: string): Promise<WatchJob> {
    const job = this.watchJobs.get(jobId);
    if (!job || job.status !== "available") {
      throw new Error("Job not available or already assigned");
    }
    
    const updatedJob = {
      ...job,
      assignedToUserId: userId,
      status: "assigned" as const,
      assignedAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.watchJobs.set(jobId, updatedJob);
    return updatedJob;
  }

  async completeWatchJob(jobId: string): Promise<WatchJob> {
    const job = this.watchJobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    const updatedJob = {
      ...job,
      status: "completed" as const,
      completedAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.watchJobs.set(jobId, updatedJob);
    return updatedJob;
  }

  // Watch history operations
  async createWatchHistory(historyData: InsertWatchHistory): Promise<WatchHistory> {
    const id = crypto.randomUUID();
    const history: WatchHistory = {
      id,
      watcherId: historyData.watcherId,
      videoId: historyData.videoId,
      watchSeconds: historyData.watchSeconds,
      coinsEarned: historyData.coinsEarned,
      clientSession: historyData.clientSession || null,
      ipAddress: historyData.ipAddress || null,
      deviceInfo: historyData.deviceInfo || null,
      createdAt: new Date(),
    };
    this.watchHistory.set(id, history);
    return history;
  }

  async getWatchHistoryByUser(userId: string): Promise<WatchHistory[]> {
    return Array.from(this.watchHistory.values())
      .filter(h => h.watcherId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Transaction operations
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const id = crypto.randomUUID();
    const transaction: Transaction = {
      id,
      userId: transactionData.userId,
      type: transactionData.type,
      amount: transactionData.amount,
      reason: transactionData.reason || null,
      paymentRef: transactionData.paymentRef || null,
      details: transactionData.details || null,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id = crypto.randomUUID();
    const payment: Payment = {
      id,
      userId: paymentData.userId,
      provider: paymentData.provider,
      providerStatus: paymentData.providerStatus,
      amountUsd: paymentData.amountUsd,
      coinsAdded: paymentData.coinsAdded,
      providerRef: paymentData.providerRef || null,
      createdAt: new Date(),
      confirmedAt: paymentData.confirmedAt || null,
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const payment = this.payments.get(id);
    if (!payment) throw new Error("Payment not found");
    
    const updatedPayment = { ...payment, ...updates };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  // Boost operations
  async createBoost(boostData: InsertBoost): Promise<Boost> {
    const id = crypto.randomUUID();
    const boost: Boost = {
      id,
      videoId: boostData.videoId,
      boostCoinsSpent: boostData.boostCoinsSpent,
      expiresAt: boostData.expiresAt,
      createdAt: new Date(),
    };
    this.boosts.set(id, boost);
    return boost;
  }

  // Referral operations
  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const id = crypto.randomUUID();
    const referral: Referral = {
      id,
      referrerId: referralData.referrerId,
      referredUserId: referralData.referredUserId,
      bonusEarned: referralData.bonusEarned || 20,
      purchaseBonus: referralData.purchaseBonus || 0,
      status: referralData.status || "active",
      createdAt: new Date(),
    };
    this.referrals.set(id, referral);
    return referral;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return Array.from(this.referrals.values())
      .filter(r => r.referrerId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.referralCode === code);
  }

  // Admin operations (duplicate removed - already exists earlier)

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeVideos: number;
    totalTransactions: number;
    totalRevenue: number;
  }> {
    const totalUsers = this.users.size;
    const activeVideos = Array.from(this.videos.values()).filter(v => v.status === "active").length;
    const totalTransactions = this.transactions.size;
    const totalRevenue = Array.from(this.payments.values())
      .filter(p => p.providerStatus === "success")
      .reduce((sum, p) => sum + Number(p.amountUsd || 0), 0);

    return {
      totalUsers,
      activeVideos,
      totalTransactions,
      totalRevenue,
    };
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = crypto.randomUUID();
    const notification: Notification = {
      id,
      userId: notificationData.userId || null,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      data: notificationData.data || null,
      isRead: notificationData.isRead || false,
      priority: notificationData.priority || "normal",
      expiresAt: notificationData.expiresAt || null,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification) throw new Error("Notification not found");
    
    notification.isRead = true;
    this.notifications.set(notificationId, notification);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    Array.from(this.notifications.entries()).forEach(([id, notification]) => {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true;
        this.notifications.set(id, notification);
      }
    });
  }

  // Video reporting operations
  async createVideoReport(reportData: InsertVideoReport): Promise<VideoReport> {
    const id = crypto.randomUUID();
    const report: VideoReport = {
      id,
      videoId: reportData.videoId,
      reporterId: reportData.reporterId,
      reason: reportData.reason || null,
      status: reportData.status || "pending",
      createdAt: new Date(),
    };
    this.videoReports.set(id, report);
    return report;
  }

  async getUserVideoReport(userId: string, videoId: string): Promise<VideoReport | undefined> {
    return Array.from(this.videoReports.values()).find(
      r => r.reporterId === userId && r.videoId === videoId
    );
  }

  async getVideoReports(videoId: string): Promise<VideoReport[]> {
    return Array.from(this.videoReports.values())
      .filter(r => r.videoId === videoId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getAllVideoReports(): Promise<VideoReport[]> {
    return Array.from(this.videoReports.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateVideoReportsStatus(videoId: string, status: string): Promise<void> {
    Array.from(this.videoReports.entries()).forEach(([id, report]) => {
      if (report.videoId === videoId) {
        report.status = status;
        this.videoReports.set(id, report);
      }
    });
  }

  // User video views tracking
  async createUserVideoView(viewData: InsertUserVideoView): Promise<UserVideoView> {
    const id = crypto.randomUUID();
    const view: UserVideoView = {
      id,
      userId: viewData.userId,
      videoId: viewData.videoId,
      lastViewedAt: viewData.lastViewedAt || new Date(),
      createdAt: new Date(),
    };
    this.userVideoViews.set(id, view);
    return view;
  }

  async getUserVideoView(userId: string, videoId: string): Promise<UserVideoView | undefined> {
    return Array.from(this.userVideoViews.values()).find(
      v => v.userId === userId && v.videoId === videoId
    );
  }

  // System settings operations (missing methods)
  private systemSettings = new Map<string, SystemSetting>();

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    return this.systemSettings.get(key);
  }

  async setSystemSetting(settingData: InsertSystemSetting): Promise<SystemSetting> {
    const id = crypto.randomUUID();
    const setting: SystemSetting = {
      id,
      key: settingData.key,
      value: settingData.value || null,
      type: settingData.type || "string",
      description: settingData.description || null,
      category: settingData.category || null,
      updatedBy: settingData.updatedBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.systemSettings.set(settingData.key, setting);
    return setting;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return Array.from(this.systemSettings.values())
      .sort((a, b) => {
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return a.key.localeCompare(b.key);
      });
  }

  async deleteSystemSetting(key: string): Promise<void> {
    this.systemSettings.delete(key);
  }

  // Website configuration operations (mock implementation for testing)
  private websiteConfig: WebsiteConfig = {
    id: crypto.randomUUID(),
    siteName: "Y2Big",
    siteDescription: "YouTube watch hours exchange platform where users can submit videos to gain watch hours and earn coins by watching other users videos.",
    siteUrl: null,
    logoUrl: null,
    faviconUrl: null,
    defaultCoinsBalance: 60,
    welcomeBonusAmount: 60,
    referralBonusAmount: 20,
    minWatchSeconds: 30,
    maxWatchSeconds: 600,
    maintenanceMode: false,
    maintenanceMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  async getWebsiteConfig(): Promise<WebsiteConfig | undefined> {
    return this.websiteConfig;
  }

  async updateWebsiteConfig(config: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    this.websiteConfig = { 
      ...this.websiteConfig, 
      ...config, 
      updatedAt: new Date() 
    };
    return this.websiteConfig;
  }

  // Payment provider operations (mock implementation for testing)
  async getAllPaymentProviders(): Promise<PaymentProvider[]> {
    return [
      {
        id: '1',
        provider: 'stripe',
        displayName: 'Credit Card (Stripe)',
        isEnabled: true,
        sortOrder: 1,
        apiSettings: null,
        uiConfig: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        provider: 'paypal',
        displayName: 'PayPal',
        isEnabled: false,
        sortOrder: 2,
        apiSettings: null,
        uiConfig: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        provider: 'binance_pay',
        displayName: 'Binance Pay',
        isEnabled: false,
        sortOrder: 3,
        apiSettings: null,
        uiConfig: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async getEnabledPaymentProviders(): Promise<PaymentProvider[]> {
    const all = await this.getAllPaymentProviders();
    return all.filter(p => p.isEnabled);
  }

  async updatePaymentProvider(provider: string, updates: Partial<PaymentProvider>): Promise<PaymentProvider> {
    // Mock implementation - returns updated provider
    const all = await this.getAllPaymentProviders();
    const found = all.find(p => p.provider === provider);
    if (!found) throw new Error('Payment provider not found');
    
    return { ...found, ...updates, updatedAt: new Date() };
  }

  async createPaymentProvider(data: Partial<PaymentProvider>): Promise<PaymentProvider> {
    // Mock implementation - returns new provider
    const newProvider: PaymentProvider = {
      id: Math.random().toString(36).substring(7),
      provider: data.provider!,
      displayName: data.displayName!,
      isEnabled: data.isEnabled ?? false,
      sortOrder: data.sortOrder ?? 0,
      apiSettings: data.apiSettings ?? {},
      uiConfig: data.uiConfig ?? {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return newProvider;
  }

  async setPaymentProviderEnabled(provider: string, enabled: boolean): Promise<PaymentProvider> {
    return this.updatePaymentProvider(provider, { isEnabled: enabled });
  }
}

export const storage = new DatabaseStorage();