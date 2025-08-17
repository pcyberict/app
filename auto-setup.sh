#!/bin/bash

# Check if setup was already completed
if [ -f ".setup_complete" ]; then
    echo "✅ Setup already completed. Starting application..."
    npm run dev
    exit 0
fi

echo "🚀 Starting one-time automatic setup..."
echo "📦 Installing dependencies..."

# Install dependencies
npm install

echo "🗄️ Setting up database and fetching all configurations..."

# Run the production setup script which:
# - Fetches all credentials from database
# - Sets up environment variables  
# - Creates missing database columns
# - Verifies all configurations
tsx scripts/setup-production.ts

# Migrate OAuth credentials to database for security
echo "🔐 Migrating OAuth credentials to database for GitHub safety..."
node scripts/migrate-credentials-to-db.js

# Mark setup as complete
touch .setup_complete
echo "✅ One-time setup completed successfully!"

echo "▶️ Starting the application..."

# Start the development server
npm run dev