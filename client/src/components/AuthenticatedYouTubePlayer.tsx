import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, ThumbsUp, ThumbsDown, Share2, Bookmark, User, Clock, MoreVertical, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// YouTube Data API and OAuth types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    gapi: any;
    google: any;
  }
}

interface VideoData {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    description: string;
    publishedAt: string;
    thumbnails: any;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface ChannelData {
  snippet: {
    title: string;
    thumbnails: {
      default: { url: string };
    };
  };
  statistics: {
    subscriberCount: string;
  };
}

interface AuthenticatedYouTubePlayerProps {
  videoId: string;
  onProgress: (seconds: number) => void;
  onComplete: () => void;
  requiredWatchTime: number;
}

export default function AuthenticatedYouTubePlayer({
  videoId,
  onProgress,
  onComplete,
  requiredWatchTime
}: AuthenticatedYouTubePlayerProps) {
  const { toast } = useToast();
  const playerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // User already authenticated via Google OAuth
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Engagement states
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [googleConfig, setGoogleConfig] = useState<{clientId: string, apiKey: string} | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Google config from server
  useEffect(() => {
    fetch('/api/google-config')
      .then(res => res.json())
      .then(config => setGoogleConfig(config))
      .catch(err => console.error('Failed to fetch Google config:', err));
  }, []);

  // Initialize Google APIs
  useEffect(() => {
    if (!googleConfig?.clientId) return;
    
    const initializeGoogleAPIs = async () => {
      // Load Google API client
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client:auth2', initializeGAPIClient);
        };
        document.head.appendChild(script);
      } else {
        initializeGAPIClient();
      }

      // Load Google Identity Services
      if (!window.google) {
        const identityScript = document.createElement('script');
        identityScript.src = 'https://accounts.google.com/gsi/client';
        identityScript.async = true;
        identityScript.defer = true;
        document.head.appendChild(identityScript);
      }
    };

    const initializeGAPIClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: googleConfig.apiKey,
          clientId: googleConfig.clientId,
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'
          ],
          scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl'
        });

        // User is already authenticated via Google OAuth
        setIsAuthenticated(true);
        loadVideoData();
      } catch (error) {
        console.error('Error initializing Google API client:', error);
      }
    };

    initializeGoogleAPIs();
  }, [googleConfig]);

  // Load video and channel data (simplified without GAPI dependency)
  const loadVideoData = async () => {
    try {
      console.log("📊 Loading video data for:", videoId);
      // For now, use mock data to ensure player works
      // In production, you can use server-side YouTube API calls
      setVideoData({
        id: videoId,
        snippet: {
          title: "YouTube Video",
          channelTitle: "YouTube Channel",
          channelId: "channel123",
          description: "Video description",
          publishedAt: new Date().toISOString(),
          thumbnails: {}
        },
        statistics: {
          viewCount: "1000",
          likeCount: "50",
          commentCount: "10"
        },
        contentDetails: {
          duration: "PT5M"
        }
      });
    } catch (error) {
      console.error('Error loading video data:', error);
    }
  };

  // Check subscription status
  const checkSubscriptionStatus = async (channelId: string) => {
    try {
      const response = await window.gapi.client.youtube.subscriptions.list({
        part: 'snippet',
        mine: true,
        forChannelId: channelId
      });

      setIsSubscribed(response.result.items.length > 0);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  // Initialize YouTube Player
  useEffect(() => {
    if (!videoId) return;

    let playerInstance: any = null;

    const initializeYouTubePlayer = () => {
      console.log("🎥 Initializing YouTube player for video:", videoId);
      
      if (!window.YT) {
        console.log("📦 Loading YouTube IFrame API...");
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => {
          console.error("❌ Failed to load YouTube IFrame API");
          toast({
            title: "Loading Error",
            description: "Failed to load YouTube player. Please refresh the page.",
            variant: "destructive"
          });
        };
        document.body.appendChild(script);

        window.onYouTubeIframeAPIReady = () => {
          console.log("✅ YouTube IFrame API loaded");
          setTimeout(() => createPlayer(), 500);
        };
      } else {
        console.log("✅ YouTube IFrame API already loaded");
        createPlayer();
      }
    };

    const createPlayer = () => {
      if (!playerRef.current) {
        console.warn("⚠️ Player container not found");
        return;
      }

      // Clear any existing content
      playerRef.current.innerHTML = '';

      console.log("🎬 Creating YouTube player instance");
      
      try {
        playerInstance = new window.YT.Player(playerRef.current, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 1, // Enable controls for better user experience
            disablekb: 0, // Allow keyboard controls
            fs: 1, // Allow fullscreen
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            playsinline: 1,
            origin: window.location.origin,
            enablejsapi: 1,
            start: 0,
            mute: 0,
          },
          events: {
            onReady: (event: any) => {
              console.log("🎉 YouTube player ready");
              setPlayer(event.target);
              // Start video automatically
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              const state = event.data;
              const stateName = getPlayerStateName(state);
              console.log("🎵 Player state changed:", stateName);
              
              setIsPlaying(state === window.YT.PlayerState.PLAYING);
              
              if (state === window.YT.PlayerState.PLAYING) {
                startWatchTimer();
              } else {
                stopWatchTimer();
              }

              if (state === window.YT.PlayerState.ENDED) {
                console.log("🏁 Video completed");
                onComplete();
              }
            },
            onError: (event: any) => {
              console.error("❌ YouTube player error:", event.data);
              const errorMessages = {
                2: "Invalid video ID",
                5: "HTML5 player error", 
                100: "Video not found or private",
                101: "Video cannot be embedded",
                150: "Video cannot be embedded"
              };
              const message = errorMessages[event.data as keyof typeof errorMessages] || "Unknown video error";
              
              toast({
                title: "Video Error",
                description: message,
                variant: "destructive"
              });
            }
          }
        });
      } catch (error) {
        console.error("❌ Error creating YouTube player:", error);
        toast({
          title: "Player Error", 
          description: "Failed to create video player. Please try again.",
          variant: "destructive"
        });
      }
    };

    const getPlayerStateName = (state: number) => {
      const states = {
        [-1]: 'UNSTARTED',
        [0]: 'ENDED',
        [1]: 'PLAYING', 
        [2]: 'PAUSED',
        [3]: 'BUFFERING',
        [5]: 'CUED'
      };
      return states[state as keyof typeof states] || 'UNKNOWN';
    };

    initializeYouTubePlayer();

    return () => {
      console.log("🧹 Cleaning up YouTube player");
      if (playerInstance) {
        try {
          playerInstance.destroy();
        } catch (e) {
          console.warn("⚠️ Error destroying player:", e);
        }
      }
      stopWatchTimer();
    };
  }, [videoId]);

  const startWatchTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (player && isPlaying) {
        try {
          const playerState = player.getPlayerState();
          if (playerState === window.YT.PlayerState.PLAYING) {
            setWatchSeconds(prev => {
              const newSeconds = prev + 1;
              onProgress(newSeconds);
              
              if (newSeconds >= requiredWatchTime) {
                onComplete();
              }
              
              return newSeconds;
            });
          }
        } catch (e) {
          console.warn("Error in watch timer:", e);
        }
      }
    }, 1000);
  };

  const stopWatchTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // User is already authenticated via Google OAuth - no sign-in handler needed

  // Engagement handlers (simplified for now)
  const handleLike = async () => {
    console.log("👍 Like button clicked for video:", videoId);
    
    try {
      // Send like action to your backend for tracking
      await fetch('/api/youtube/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      
      setHasLiked(true);
      setHasDisliked(false);
      
      toast({
        title: "Video Liked!",
        description: "Your like has been recorded!",
      });
    } catch (error) {
      console.error('Error liking video:', error);
      toast({
        title: "Like Error",
        description: "Failed to like video. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDislike = async () => {
    console.log("👎 Dislike button clicked for video:", videoId);
    
    try {
      await fetch('/api/youtube/dislike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      
      setHasDisliked(true);
      setHasLiked(false);
      
      toast({
        title: "Video Disliked",
        description: "Your dislike has been recorded.",
      });
    } catch (error) {
      console.error('Error disliking video:', error);
      toast({
        title: "Dislike Error",
        description: "Failed to dislike video. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubscribe = async () => {
    // User is already authenticated via Google OAuth

    if (!videoData) return;

    try {
      if (isSubscribed) {
        // Unsubscribe
        const subscriptions = await window.gapi.client.youtube.subscriptions.list({
          part: 'id',
          mine: true,
          forChannelId: videoData.snippet.channelId
        });

        if (subscriptions.result.items.length > 0) {
          await window.gapi.client.youtube.subscriptions.delete({
            id: subscriptions.result.items[0].id
          });
          setIsSubscribed(false);
          
          toast({
            title: "Unsubscribed",
            description: "You have unsubscribed from this channel on YouTube.",
          });
        }
      } else {
        // Subscribe
        await window.gapi.client.youtube.subscriptions.insert({
          part: 'snippet',
          resource: {
            snippet: {
              resourceId: {
                kind: 'youtube#channel',
                channelId: videoData.snippet.channelId
              }
            }
          }
        });
        
        setIsSubscribed(true);
        
        toast({
          title: "Subscribed!",
          description: "You are now subscribed to this channel on YouTube!",
        });
      }
    } catch (error) {
      console.error('Error subscribing/unsubscribing:', error);
      toast({
        title: "Subscription Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      await navigator.clipboard.writeText(videoUrl);
      toast({
        title: "Video Shared!",
        description: "Video URL copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Video URL",
        description: videoUrl,
      });
    }
  };

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  const formatSubscriberCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getTimeAgo = (publishedAt: string) => {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInMonths = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (diffInMonths >= 12) {
      const years = Math.floor(diffInMonths / 12);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (diffInMonths > 0) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="space-y-4">
      {/* YouTube Player */}
      <div className="relative aspect-video bg-black">
        <div ref={playerRef} className="w-full h-full" />
        
        {/* User is already authenticated via Google OAuth - no sign-in needed */}
      </div>

      {/* Video Info */}
      {videoData && (
        <div className="space-y-4">
          {/* Title and stats */}
          <div>
            <h1 className="text-xl font-bold text-white mb-2 line-clamp-2">
              {videoData.snippet.title}
            </h1>
            
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
              <span>{formatViewCount(videoData.statistics.viewCount)} views</span>
              <span>•</span>
              <span>{getTimeAgo(videoData.snippet.publishedAt)}</span>
              <button className="text-gray-400 hover:text-white ml-auto">
                ...more
              </button>
            </div>
          </div>

          {/* Channel and actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Channel info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={channelData?.snippet.thumbnails.default.url} 
                  alt={videoData.snippet.channelTitle} 
                />
                <AvatarFallback className="bg-gray-700 text-white">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col">
                <span className="font-semibold text-white">{videoData.snippet.channelTitle}</span>
                {channelData && (
                  <span className="text-gray-400 text-sm">
                    {formatSubscriberCount(channelData.statistics.subscriberCount)}
                  </span>
                )}
              </div>
              
              <Button 
                onClick={handleSubscribe}
                disabled={!isAuthenticated}
                className={`ml-4 px-6 py-2 rounded-full font-semibold ${
                  isSubscribed 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Like/Dislike */}
              <div className="flex items-center bg-gray-800 rounded-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={!isAuthenticated}
                  className={`flex items-center gap-2 px-4 py-2 rounded-l-full ${
                    hasLiked ? 'text-blue-400' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">
                    {formatViewCount(videoData.statistics.likeCount)}
                  </span>
                </Button>
                
                <div className="w-px h-6 bg-gray-600"></div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDislike}
                  disabled={!isAuthenticated}
                  className={`px-4 py-2 rounded-r-full ${
                    hasDisliked ? 'text-red-400' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <ThumbsDown className={`h-4 w-4 ${hasDisliked ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Share */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full text-white hover:bg-gray-700"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-sm font-medium">Share</span>
              </Button>

              {/* More */}
              <Button
                variant="ghost"
                size="sm"
                className="bg-gray-800 px-3 py-2 rounded-full text-white hover:bg-gray-700"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}