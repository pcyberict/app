import { Request, Response } from 'express';

// YouTube session management for authenticated users
export async function createYouTubeSession(req: Request, res: Response) {
  try {
    const { videoId } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's Google OAuth tokens from database
    const user = req.user as any;
    const accessToken = user.google_access_token;
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Google OAuth not available' });
    }

    // Create authenticated YouTube session URL
    const sessionUrl = createAuthenticatedEmbedUrl(videoId, accessToken);
    
    res.json({
      sessionUrl,
      isAuthenticated: true,
      userName: user.username || user.email,
      hasAccess: true
    });
    
  } catch (error) {
    console.error('Error creating YouTube session:', error);
    res.status(500).json({ error: 'Failed to create YouTube session' });
  }
}

function createAuthenticatedEmbedUrl(videoId: string, accessToken?: string): string {
  const baseUrl = `https://www.youtube.com/embed/${videoId}`;
  
  const params = new URLSearchParams({
    // Core YouTube features enabled
    autoplay: '1',
    controls: '1',
    modestbranding: '0',  // Show full YouTube branding
    rel: '1',             // Show related videos
    showinfo: '1',        // Show video info
    iv_load_policy: '1',  // Show annotations
    cc_load_policy: '1',  // Show captions
    fs: '1',              // Allow fullscreen
    disablekb: '0',       // Allow keyboard controls
    playsinline: '0',     // Don't force inline
    
    // Authentication and session
    enablejsapi: '1',
    origin: process.env.REPLIT_DEV_DOMAIN || 'localhost:5000',
    
    // Ads and monetization - ensure all ads are shown
    ad_tag: '1',
    adsystem: 'youtube',
    
    // Quality and performance
    html5: '1',
    vq: 'auto',
    
    // Session token if available
    ...(accessToken && { access_token: accessToken })
  });

  return `${baseUrl}?${params.toString()}`;
}

// YouTube API interaction endpoints
export async function likeVideo(req: Request, res: Response) {
  try {
    const { videoId } = req.body;
    const user = req.user as any;
    
    if (!user?.google_access_token) {
      return res.status(401).json({ error: 'YouTube authentication required' });
    }

    // Use Google APIs to like the video
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${videoId}&rating=like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.google_access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      res.json({ success: true, action: 'liked' });
    } else {
      res.status(400).json({ error: 'Failed to like video' });
    }
    
  } catch (error) {
    console.error('Error liking video:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function dislikeVideo(req: Request, res: Response) {
  try {
    const { videoId } = req.body;
    const user = req.user as any;
    
    if (!user?.google_access_token) {
      return res.status(401).json({ error: 'YouTube authentication required' });
    }

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos/rate?id=${videoId}&rating=dislike`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.google_access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      res.json({ success: true, action: 'disliked' });
    } else {
      res.status(400).json({ error: 'Failed to dislike video' });
    }
    
  } catch (error) {
    console.error('Error disliking video:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function subscribeToChannel(req: Request, res: Response) {
  try {
    const { channelId } = req.body;
    const user = req.user as any;
    
    if (!user?.google_access_token) {
      return res.status(401).json({ error: 'YouTube authentication required' });
    }

    const response = await fetch('https://www.googleapis.com/youtube/v3/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.google_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          resourceId: {
            kind: 'youtube#channel',
            channelId: channelId
          }
        }
      })
    });

    if (response.ok) {
      res.json({ success: true, action: 'subscribed' });
    } else {
      res.status(400).json({ error: 'Failed to subscribe' });
    }
    
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function unsubscribeFromChannel(req: Request, res: Response) {
  try {
    const { channelId } = req.body;
    const user = req.user as any;
    
    if (!user?.google_access_token) {
      return res.status(401).json({ error: 'YouTube authentication required' });
    }

    // First get the subscription ID
    const listResponse = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&forChannelId=${channelId}`, {
      headers: {
        'Authorization': `Bearer ${user.google_access_token}`
      }
    });

    const subscriptions = await listResponse.json();
    
    if (subscriptions.items && subscriptions.items.length > 0) {
      const subscriptionId = subscriptions.items[0].id;
      
      const deleteResponse = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?id=${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.google_access_token}`
        }
      });

      if (deleteResponse.ok) {
        res.json({ success: true, action: 'unsubscribed' });
      } else {
        res.status(400).json({ error: 'Failed to unsubscribe' });
      }
    } else {
      res.status(404).json({ error: 'Subscription not found' });
    }
    
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Server error' });
  }
}