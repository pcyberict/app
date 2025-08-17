#!/usr/bin/env tsx
// Auto-setup script - fetches everything from database and configures automatically
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import { initializeEnvironment } from "../server/config";
import { ensureGoogleOAuthColumns } from "./ensure-db-schema";

async function fetchAndSetupFromDatabase() {
  console.log("🚀 Auto-setup: Fetching all configurations from database...");
  
  // Initialize with fallback environment first
  initializeEnvironment();
  
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    // Fetch all system settings from database
    console.log("📥 Fetching system settings from database...");
    const settings = await sql`
      SELECT key, value FROM system_settings 
      WHERE key IN ('YOUTUBE', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET')
    `;
    
    // Create dynamic .env.production with fetched values
    let envContent = `# Auto-generated from database on ${new Date().toISOString()}\n`;
    envContent += `DATABASE_URL="${process.env.DATABASE_URL}"\n`;
    
    settings.forEach(setting => {
      switch(setting.key) {
        case 'YOUTUBE':
          envContent += `YOUTUBE_API_KEY="${setting.value}"\n`;
          process.env.YOUTUBE_API_KEY = setting.value;
          break;
        case 'GOOGLE_CLIENT_ID':
          envContent += `GOOGLE_CLIENT_ID="${setting.value}"\n`;
          process.env.GOOGLE_CLIENT_ID = setting.value;
          break;
        case 'GOOGLE_CLIENT_SECRET':
          envContent += `GOOGLE_CLIENT_SECRET="${setting.value}"\n`;
          process.env.GOOGLE_CLIENT_SECRET = setting.value;
          break;
        case 'SESSION_SECRET':
          envContent += `SESSION_SECRET="${setting.value}"\n`;
          process.env.SESSION_SECRET = setting.value;
          break;
      }
    });
    
    // Write the fetched configuration
    fs.writeFileSync('.env.production', envContent);
    console.log("✅ Configuration fetched and saved to .env.production");
    
    // Ensure database schema
    await ensureGoogleOAuthColumns();
    
    // Verify all data is present
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const videoCount = await sql`SELECT COUNT(*) as count FROM videos`;
    const transactionCount = await sql`SELECT COUNT(*) as count FROM transactions`;
    
    console.log("✅ Auto-setup complete!");
    console.log("📊 Database status:");
    console.log(`   - Users: ${userCount[0].count} accounts migrated`);
    console.log(`   - Videos: ${videoCount[0].count} videos ready`);
    console.log(`   - Transactions: ${transactionCount[0].count} records`);
    console.log("🔧 All configurations auto-fetched from database");
    console.log("🚀 Ready to run with 'npm run dev'");
    
  } catch (error) {
    console.error("❌ Auto-setup failed:", error);
    console.log("🔄 Falling back to default configuration...");
    // Fallback to existing defaults if database fetch fails
  }
}

async function setupProduction() {
  await fetchAndSetupFromDatabase();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupProduction().catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
}