import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number"),
  countryCode: varchar("country_code"),
  country: varchar("country"),
  role: varchar("role").default("user"), // user, moderator, admin
  status: varchar("status").default("active"), // active, banned, suspended
  coinsBalance: integer("coins_balance").default(60), // Start with 60 coins welcome bonus
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"),
  welcomeBonusReceived: boolean("welcome_bonus_received").default(false),
  googleId: varchar("google_id").unique(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  youtubeId: varchar("youtube_id").notNull(),
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds").notNull(),
  requestedWatchSeconds: integer("requested_watch_seconds").notNull(),
  requestedWatches: integer("requested_watches").notNull(),
  coinsRequiredTotal: integer("coins_required_total").notNull(),
  coinsSpent: integer("coins_spent").default(0),
  boostLevel: integer("boost_level").default(0),
  status: varchar("status").default("active"), // active, paused, completed, removed, flagged
  orderId: varchar("order_id").notNull().unique(), // Unique order ID for each submission
  completedWatches: integer("completed_watches").default(0), // Track completed watches
  reportCount: integer("report_count").default(0), // Track number of reports
  flaggedAt: timestamp("flagged_at"), // When video was flagged
  completedAt: timestamp("completed_at"), // When video reached target watches
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const watchJobs = pgTable("watch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  watchSecondsRequired: integer("watch_seconds_required").notNull(),
  status: varchar("status").default("available"), // available, assigned, completed, failed
  assignedAt: timestamp("assigned_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchHistory = pgTable("watch_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  watcherId: varchar("watcher_id").references(() => users.id).notNull(),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  watchSeconds: integer("watch_seconds").notNull(),
  coinsEarned: integer("coins_earned").notNull(),
  clientSession: varchar("client_session"),
  ipAddress: varchar("ip_address"),
  deviceInfo: jsonb("device_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // earn_watch, buy_coins, spend_coins, manual_adjustment, welcome_bonus, referral_bonus, referral_purchase_bonus
  amount: integer("amount").notNull(), // positive or negative
  reason: text("reason"), // Human readable reason for the transaction
  paymentRef: varchar("payment_ref"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  provider: varchar("provider").notNull(), // stripe, paypal
  providerStatus: varchar("provider_status").notNull(), // pending, success, failed
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  coinsAdded: integer("coins_added").notNull(),
  providerRef: varchar("provider_ref"),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const boosts = pgTable("boosts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  boostCoinsSpent: integer("boost_coins_spent").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => users.id).notNull(),
  referredUserId: varchar("referred_user_id").references(() => users.id).notNull(),
  bonusEarned: integer("bonus_earned").default(20), // 20 coins per referral
  purchaseBonus: integer("purchase_bonus").default(0), // Extra bonus when referred user buys
  status: varchar("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

// Video reports table for flagging system
export const videoReports = pgTable("video_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  reporterId: varchar("reporter_id").references(() => users.id).notNull(),
  reason: text("reason"),
  status: varchar("status").default("pending"), // pending, reviewed, dismissed
  createdAt: timestamp("created_at").defaultNow(),
});

// User video views tracking (to ensure unique views per hour)
export const userVideoViews = pgTable("user_video_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  lastViewedAt: timestamp("last_viewed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings table for API keys and configuration
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value"),
  type: varchar("type").default("string"), // string, number, boolean, encrypted
  description: text("description"),
  category: varchar("category"), // grouping for settings
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // system, payment, watch_complete, video_approved, etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional notification data
  isRead: boolean("is_read").default(false),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWatchJobSchema = createInsertSchema(watchJobs).omit({
  id: true,
  createdAt: true,
});

export const insertWatchHistorySchema = createInsertSchema(watchHistory).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertBoostSchema = createInsertSchema(boosts).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertVideoReportSchema = createInsertSchema(videoReports).omit({
  id: true,
  createdAt: true,
});

export const insertUserVideoViewSchema = createInsertSchema(userVideoViews).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Payment provider configurations table for buy-coins page
export const paymentProviders = pgTable("payment_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider").notNull().unique(), // stripe, paypal, binance_pay
  displayName: varchar("display_name").notNull(),
  isEnabled: boolean("is_enabled").default(false),
  sortOrder: integer("sort_order").default(0),
  apiSettings: jsonb("api_settings"), // Store API keys and configuration securely
  uiConfig: jsonb("ui_config"), // Colors, icons, button text etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Admin action logs for audit trail
export const adminLogs = pgTable("admin_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // user_created, settings_updated, payment_config_changed, etc.
  targetType: varchar("target_type"), // user, video, payment_provider, etc.
  targetId: varchar("target_id"),
  details: jsonb("details"), // Store detailed information about the action
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Website configuration table for global settings
export const websiteConfig = pgTable("website_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteName: varchar("site_name").default("Y2Big"),
  siteDescription: text("site_description"),
  siteUrl: varchar("site_url"),
  logoUrl: varchar("logo_url"),
  faviconUrl: varchar("favicon_url"),
  defaultCoinsBalance: integer("default_coins_balance").default(60),
  welcomeBonusAmount: integer("welcome_bonus_amount").default(60),
  referralBonusAmount: integer("referral_bonus_amount").default(20),
  minWatchSeconds: integer("min_watch_seconds").default(30),
  maxWatchSeconds: integer("max_watch_seconds").default(600),
  maintenanceMode: boolean("maintenance_mode").default(false),
  maintenanceMessage: text("maintenance_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertPaymentProviderSchema = createInsertSchema(paymentProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export const insertWebsiteConfigSchema = createInsertSchema(websiteConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for all tables
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type WatchJob = typeof watchJobs.$inferSelect;
export type WatchHistory = typeof watchHistory.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Boost = typeof boosts.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type VideoReport = typeof videoReports.$inferSelect;
export type UserVideoView = typeof userVideoViews.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type PaymentProvider = typeof paymentProviders.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AdminLog = typeof adminLogs.$inferSelect;
export type WebsiteConfig = typeof websiteConfig.$inferSelect;

// Insert type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertWatchJob = z.infer<typeof insertWatchJobSchema>;
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertBoost = z.infer<typeof insertBoostSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InsertVideoReport = z.infer<typeof insertVideoReportSchema>;
export type InsertUserVideoView = z.infer<typeof insertUserVideoViewSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type InsertPaymentProvider = z.infer<typeof insertPaymentProviderSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type InsertWebsiteConfig = z.infer<typeof insertWebsiteConfigSchema>;

// Re-export notification types
export * from "./notificationSchema";
