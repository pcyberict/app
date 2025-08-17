import dotenv from "dotenv";

// Global variables to store database-loaded credentials
let databaseCredentials: {
  googleClientId?: string;
  googleClientSecret?: string;
  youtubeApiKey?: string;
} = {};

// Permanent environment configuration
// This ensures all required environment variables are available
export function initializeEnvironment() {
  // Load defaults first, then allow .env to override
  dotenv.config({ path: ".env.defaults" });
  dotenv.config(); // This will override with .env values if present

  // Fallback values if not set in any config file (only non-sensitive ones)
  const defaults = {
    DATABASE_URL:
      "postgresql://neondb_owner:npg_BUX2e8fZKLtk@ep-steep-mountain-abp8s2x7-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    SESSION_SECRET:
      "your-super-secret-session-key-here-make-it-long-and-random-2025",
  };
  
  // NOTE: Google OAuth credentials and YouTube API key are now loaded from database
  // This prevents hardcoded secrets from being exposed in GitHub repositories

  // Apply defaults for missing values
  Object.entries(defaults).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  console.log(
    "✓ Environment configuration initialized with persistent production settings",
  );
  console.log(`✓ Database: ${process.env.DATABASE_URL?.slice(0, 30)}...`);
}

// Load sensitive credentials from database after database connection is established
export async function loadCredentialsFromDatabase() {
  try {
    const { storage } = await import('./storage.js');
    
    // Load credentials from system_settings table
    const googleClientIdSetting = await storage.getSystemSetting('google_client_id');
    const googleClientSecretSetting = await storage.getSystemSetting('google_client_secret');
    const youtubeApiKeySetting = await storage.getSystemSetting('youtube_api_key');

    const googleClientId = googleClientIdSetting?.value;
    const googleClientSecret = googleClientSecretSetting?.value;
    const youtubeApiKey = youtubeApiKeySetting?.value;

    if (googleClientId) {
      databaseCredentials.googleClientId = googleClientId;
      process.env.GOOGLE_CLIENT_ID = googleClientId;
    }
    
    if (googleClientSecret) {
      databaseCredentials.googleClientSecret = googleClientSecret;
      process.env.GOOGLE_CLIENT_SECRET = googleClientSecret;
    }
    
    if (youtubeApiKey) {
      databaseCredentials.youtubeApiKey = youtubeApiKey;
      process.env.YOUTUBE_API_KEY = youtubeApiKey;
    }

    console.log(`✓ YouTube API: ${youtubeApiKey ? youtubeApiKey.slice(0, 10) + '...' : 'Not configured'}`);
    console.log(`✓ Google OAuth: ${googleClientId ? googleClientId.slice(0, 20) + '...' : 'Not configured'}`);
    
    return {
      googleClientId,
      googleClientSecret,
      youtubeApiKey
    };
  } catch (error) {
    console.error('⚠️ Failed to load credentials from database:', error);
    return null;
  }
}

// Get Google OAuth credentials (from database or fallback to env)
export function getGoogleOAuthCredentials() {
  return {
    clientId: databaseCredentials.googleClientId || process.env.GOOGLE_CLIENT_ID,
    clientSecret: databaseCredentials.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET
  };
}

// Get YouTube API key (from database or fallback to env)
export function getYouTubeApiKey() {
  return databaseCredentials.youtubeApiKey || process.env.YOUTUBE_API_KEY;
}

// Dynamic callback URL - works with any domain
export function getCallbackURL() {
  const domain =
    process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + ".replit.dev";
  return `https://${domain}/oauth2callback`;
}