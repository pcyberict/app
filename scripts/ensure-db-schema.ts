#!/usr/bin/env tsx
// Database schema migration script to ensure all required columns exist
import dotenv from "dotenv";
dotenv.config();

import { initializeEnvironment } from "../server/config";
initializeEnvironment();

import { neon } from "@neondatabase/serverless";

async function ensureGoogleOAuthColumns() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    console.log("🔍 Checking Google OAuth columns...");
    
    // Check if google_id column exists
    const googleIdCheck = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'google_id'
    `;
    
    if (googleIdCheck.length === 0) {
      console.log("➕ Adding google_id column...");
      await sql`ALTER TABLE users ADD COLUMN google_id VARCHAR UNIQUE`;
    }
    
    // Check if google_access_token column exists
    const accessTokenCheck = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'google_access_token'
    `;
    
    if (accessTokenCheck.length === 0) {
      console.log("➕ Adding google_access_token column...");
      await sql`ALTER TABLE users ADD COLUMN google_access_token TEXT`;
    }
    
    // Check if google_refresh_token column exists
    const refreshTokenCheck = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'google_refresh_token'
    `;
    
    if (refreshTokenCheck.length === 0) {
      console.log("➕ Adding google_refresh_token column...");
      await sql`ALTER TABLE users ADD COLUMN google_refresh_token TEXT`;
    }
    
    console.log("✅ All Google OAuth columns are present");
    
    // Verify all columns
    const allColumns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name LIKE '%google%'
      ORDER BY column_name
    `;
    
    console.log("📋 Google OAuth columns:", allColumns.map(col => col.column_name));
    
  } catch (error) {
    console.error("❌ Error ensuring database schema:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureGoogleOAuthColumns().then(() => {
    console.log("🎉 Database schema verification complete");
    process.exit(0);
  });
}

export { ensureGoogleOAuthColumns };