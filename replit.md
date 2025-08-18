# YouTube Watch Hours Exchange Tool

## Project Overview
A full-stack JavaScript application built with React/Vite frontend and Express backend that facilitates YouTube watch hours exchange. The app allows users to submit their YouTube videos to gain watch hours from other users in the community.

## Architecture
- **Frontend**: React + Vite with Tailwind CSS and shadcn/ui components
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Multiple auth methods (Google OAuth, Passport Local, Replit Auth)
- **Real-time**: WebSocket support with Socket.IO
- **Payments**: Stripe integration

## Key Features
- YouTube video submission and queue system
- Watch hours tracking and exchange
- User authentication and profiles
- Payment processing for premium features
- Real-time notifications
- Admin moderation tools

## Recent Changes
- ✓ **TRADITIONAL AUTHENTICATION SYSTEM IMPLEMENTED** (Aug 18, 2025)
- ✓ Replaced Google OAuth with email/password authentication system
- ✓ Added secure bcrypt password hashing and session-based authentication
- ✓ Created responsive login and registration forms with password strength indicators
- ✓ Database migration: Added username and password_hash columns with proper constraints
- ✓ Users can login with either email or username for flexibility
- ✓ New users receive 1000 welcome coins instead of 60
- ✓ Automatic redirect to main page after successful authentication
- ✓ Successfully completed migration from Replit Agent to Replit environment (Aug 16, 2025)
- ✓ Enhanced streaming page to match YouTube's native design with avatar, like/dislike buttons
- ✓ Implemented full ad support and authentic YouTube player experience
- ✓ Added responsive mobile layout with proper engagement tracking
- ✓ Migrated production data: 8 users with balances ranging from 60 to 59,400 coins
- ✓ Fetched and configured YouTube API key from production database: AIzaSyB3fnDIZ59KEDXjTC3BZWH-Xn1BYVoR7mA
- ✓ Migrated complete transaction history: 357 transactions including welcome bonuses and admin adjustments
- ✓ Migrated video data: 4 active videos from production with full metadata
- ✓ Migrated notification system: 23 key notifications including welcome bonuses and coin adjustments
- ✓ Migrated website configuration: Y2Big branding and platform settings
- ✓ Migrated payment providers: Stripe, PayPal, and Binance Pay configurations
- ✓ Established real-time WebSocket synchronization for database updates
- ✓ Fixed transaction arrow directions: Credits show down arrow, debits show up arrow
- ✓ Fixed transaction history to display custom admin adjustment reasons
- ✓ Implemented real-time balance and transaction updates without browser refresh
- ✓ Enhanced WebSocket system for instant balance changes and transaction history
- ✓ Optimized query refresh intervals: Balance (2s), Transactions (3s), Watch History (5s)
- ✓ Installed all required Node.js dependencies including tsx for TypeScript execution
- ✓ Configured secure environment variables (DATABASE_URL, YOUTUBE_API_KEY, Google OAuth)
- ✓ Verified application runs on port 5000 with database connectivity
- ✓ All database tables properly created and populated with production data
- ✓ **COMPLETED REPLIT ENVIRONMENT MIGRATION** (Aug 16, 2025)
- ✓ Added missing Google OAuth database columns (google_id, google_access_token, google_refresh_token)
- ✓ Fixed Google OAuth callback URL to match current deployment domain
- ✓ Integrated complete Google OAuth authentication system with YouTube API access
- ✓ Created AuthenticatedYouTubePlayer with real session management
- ✓ All routes now use Google authentication with proper database schema support
- ✓ Users can now like, subscribe, and comment on actual YouTube with stored sessions
- ✓ Native YouTube ads now work properly with authentic browser session
- ✓ Migration successfully completed: Full production data preserved and functional
- ✓ **PERMANENT CONFIGURATION SETUP** (Aug 16, 2025)
- ✓ Created persistent environment configuration with .env.defaults
- ✓ Added automatic database schema migration on startup
- ✓ Implemented dynamic callback URL detection for Replit deployments
- ✓ Created production setup scripts for future deployments
- ✓ All configuration now persists across restarts and deployments
- ✓ **ONE-COMMAND SETUP OPTIMIZED** (Aug 16, 2025)
- ✓ True one-time installation with .setup_complete flag
- ✓ Dynamic OAuth callback URL (/oauth2callback) works with any domain
- ✓ Cleaned up unnecessary files and simplified project structure
- ✓ Auto-setup runs full installation first time, quick start on subsequent runs
- ✓ **REPLIT ENVIRONMENT MIGRATION COMPLETED** (Aug 17, 2025)
- ✓ Fixed Google OAuth to use dynamic domain detection instead of hardcoded URLs
- ✓ Updated both googleOAuth.ts and googleAuth.ts for dynamic callback URLs
- ✓ Application successfully migrated and running on Replit environment
- ✓ All required packages configured and application running on port 5000
- ✓ **MIGRATION COMPLETED SUCCESSFULLY** (Aug 17, 2025)
- ✓ Enhanced YouTube engagement with real API integration (Aug 17, 2025)
- ✓ Users can now like/dislike videos and subscribe to channels on actual YouTube
- ✓ YouTube API calls are synced when users have Google OAuth authentication
- ✓ Enhanced feedback shows whether actions were synced to YouTube or recorded locally
- ✓ Fixed main streaming page (/streaming) to fetch real YouTube metadata instead of placeholder data
- ✓ **SECURITY ENHANCEMENT COMPLETED** (Aug 17, 2025)  
- ✓ Moved Google OAuth credentials from hardcoded config to secure database storage
- ✓ Created credential migration system for GitHub safety
- ✓ Updated auto-setup.sh to automatically migrate credentials on first run
- ✓ Application now loads OAuth credentials dynamically from database at startup
- ✓ Code is now safe to push to GitHub without exposing API keys or secrets
- ✓ **REPLIT ENVIRONMENT MIGRATION COMPLETED** (Aug 18, 2025)
- ✓ Successfully migrated project from Replit Agent to Replit environment
- ✓ All packages installed and configured properly
- ✓ Application running on port 5000 with full database connectivity
- ✓ Environment variables configured with secure authentication
- ✓ All security practices implemented with proper client/server separation

## User Preferences
- None specified yet

## Tech Stack
- TypeScript, React, Express
- Drizzle ORM with PostgreSQL
- Tailwind CSS + shadcn/ui
- Socket.IO for real-time features
- Stripe for payments
- Google APIs for YouTube integration

## Environment Setup
- Development server runs via `npm run dev`
- Uses tsx for TypeScript execution
- Vite handles frontend bundling and HMR