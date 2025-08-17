import fetch from 'node-fetch';
import type { Express } from "express";
import { isAuthenticated } from "./googleAuth";
import { storage } from "./storage";

// YouTube proxy to handle authenticated requests
export function setupYouTubeProxy(app: Express) {
  
  // Proxy YouTube watch page with user session
  app.get('/api/youtube/watch/:videoId', isAuthenticated, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const user = await storage.getUser(req.user.id);
      
      if (!user || !user.googleAccessToken) {
        return res.status(401).json({ message: "Google authentication required" });
      }

      // Set up cookies and headers to mimic authenticated YouTube session
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Create response that includes user session context
      res.json({
        youtubeUrl,
        videoId,
        userToken: user.googleAccessToken,
        sessionValid: true
      });
      
    } catch (error) {
      console.error('YouTube proxy error:', error);
      res.status(500).json({ message: "Failed to load YouTube content" });
    }
  });

  // YouTube API proxy with authentication
  app.get('/api/youtube/api/:endpoint', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.params;
      const user = await storage.getUser(req.user.id);
      
      if (!user || !user.googleAccessToken) {
        return res.status(401).json({ message: "Google authentication required" });
      }

      const apiUrl = `https://www.googleapis.com/youtube/v3/${endpoint}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${user.googleAccessToken}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      res.json(data);
      
    } catch (error) {
      console.error('YouTube API proxy error:', error);
      res.status(500).json({ message: "Failed to access YouTube API" });
    }
  });
}