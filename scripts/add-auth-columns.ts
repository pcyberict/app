import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addAuthColumns() {
  try {
    console.log('Adding authentication columns to users table...');
    
    // Add username column
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE`);
    console.log('✓ Added username column');
    
    // Add password_hash column
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    console.log('✓ Added password_hash column');
    
    // Update existing users to have a unique username based on email
    await db.execute(sql`
      UPDATE users 
      SET username = SPLIT_PART(email, '@', 1) || '_' || EXTRACT(EPOCH FROM created_at)::text
      WHERE username IS NULL AND email IS NOT NULL
    `);
    console.log('✓ Generated usernames for existing users');
    
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addAuthColumns().then(() => {
  console.log('Migration completed. Exiting...');
  process.exit(0);
});