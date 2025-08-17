import { google } from "googleapis";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { getCallbackURL } from "./config";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

let oauth2Client: any = null;

// Initialize Google OAuth client
export function initializeGoogleOAuth() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn(
      "Google OAuth credentials not provided - using Replit auth fallback",
    );
    return null;
  }

  const REDIRECT_URI = getCallbackURL();

  oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
  );

  console.log("🔧 Google OAuth client initialized:");
  console.log("   Client ID:", GOOGLE_CLIENT_ID);
  console.log("   Redirect URI:", REDIRECT_URI);

  return oauth2Client;
}

// Setup Google OAuth routes
export function setupGoogleOAuth(app: Express) {
  if (!oauth2Client) {
    console.log("Google OAuth not configured, skipping setup");
    return;
  }

  // Google OAuth login
  app.get("/api/auth/google", (req, res) => {
    const scopes = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes.join(" "),
      response_type: "code",
      include_granted_scopes: true,
    });

    const redirectUri = getCallbackURL();
    console.log("🔗 Generated Google OAuth URL:", url);
    console.log("📍 Configured redirect URI:", redirectUri);
    console.log(
      "🔍 URL contains redirect_uri:",
      url.includes(encodeURIComponent(redirectUri)),
    );

    res.redirect(url);
  });

  // Google OAuth callback - both routes for compatibility
  app.get("/oauth2callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.redirect("/?error=no_code");
    }

    try {
      const { tokens } = await oauth2Client.getAccessToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();

      // Store user in database
      const user = await storage.upsertUser({
        id: userInfo.id!,
        email: userInfo.email!,
        firstName: userInfo.given_name || "",
        lastName: userInfo.family_name || "",
        profileImageUrl: userInfo.picture || "",
        googleAccessToken: tokens.access_token || "",
        googleRefreshToken: tokens.refresh_token || "",
      });

      // Store user session
      (req.session as any).user = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };

      res.redirect("/");
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/?error=oauth_failed");
    }
  });

  // Google OAuth logout
  app.get("/api/auth/google/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      res.redirect("/");
    });
  });
}

// Enhanced authentication middleware for Google OAuth
export const isGoogleAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;

  if (!session?.user?.id) {
    return res
      .status(401)
      .json({ message: "Unauthorized - Please login with Google" });
  }

  try {
    // Check if user exists and is not banned
    const userData = await storage.getUser(session.user.id);
    if (userData && userData.status === "banned") {
      return res
        .status(403)
        .json({ message: "Account has been banned", banned: true });
    }

    // Set user data for route handlers
    (req as any).user = {
      id: session.user.id,
      email: session.user.email,
      accessToken: session.user.accessToken,
      refreshToken: session.user.refreshToken,
    };

    return next();
  } catch (error) {
    console.error("Error checking user authentication:", error);
    return res.status(401).json({ message: "Authentication error" });
  }
};

// YouTube API helper functions
export async function getYouTubeClient(accessToken: string) {
  if (!oauth2Client) {
    throw new Error("Google OAuth not configured");
  }

  oauth2Client.setCredentials({ access_token: accessToken });
  return google.youtube({ version: "v3", auth: oauth2Client });
}

// Enhanced YouTube video interaction functions
export async function likeYouTubeVideo(accessToken: string, videoId: string) {
  try {
    const youtube = await getYouTubeClient(accessToken);

    await youtube.videos.rate({
      id: videoId,
      rating: "like",
    });

    return { success: true };
  } catch (error) {
    console.error("Error liking YouTube video:", error);
    throw new Error("Failed to like video on YouTube");
  }
}

export async function commentOnYouTubeVideo(
  accessToken: string,
  videoId: string,
  comment: string,
) {
  try {
    const youtube = await getYouTubeClient(accessToken);

    await youtube.commentThreads.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: {
              textOriginal: comment,
            },
          },
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error commenting on YouTube video:", error);
    throw new Error("Failed to comment on YouTube video");
  }
}

export async function subscribeToYouTubeChannel(
  accessToken: string,
  channelId: string,
) {
  try {
    const youtube = await getYouTubeClient(accessToken);

    await youtube.subscriptions.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          resourceId: {
            kind: "youtube#channel",
            channelId: channelId,
          },
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error subscribing to YouTube channel:", error);
    throw new Error("Failed to subscribe to YouTube channel");
  }
}
