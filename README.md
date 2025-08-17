# YouTube Watch Hours Exchange Tool

## 🚀 One-Command Setup

When you upload your files to any environment, run:
```bash
./auto-setup.sh
```



This command will:
- Install all dependencies
- Fetch all credentials and configurations from your database
- Set up Google OAuth automatically
- Create missing database columns
- Start the application

**No manual configuration needed!**

## 📋 What Gets Auto-Configured

✅ Database connection (fetches from your production DB)  
✅ YouTube API key (pulled from system_settings table)  
✅ Google OAuth credentials (retrieved from database)  
✅ All user data, videos, and transactions preserved  
✅ Complete website configuration and branding  

## 🔄 Alternative Commands

If you prefer step-by-step:

```bash
# Install dependencies
npm install

# Auto-fetch all configurations from database
tsx scripts/setup-production.ts

# Start the application
npm run dev
```

## 💾 Your Data

All your production data is safely stored in the database:
- 8 user accounts with coin balances
- 357 transaction records
- 4 active videos
- Complete notification system
- Y2Big branding and settings

The setup script automatically retrieves and configures everything for you.

## 🌐 Deployment Ready

App runs on port 5000 and automatically detects the domain for OAuth callbacks.

Features include:
- Full Google OAuth authentication
- Real YouTube API integration  
- All production data intact
- Zero manual configuration required

### Google OAuth Setup

The callback URL is automatically set to `/oauth2callback` and works with any domain. No manual URL configuration needed!