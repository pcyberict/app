import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, ThumbsUp, ThumbsDown, Share2, Bookmark, MoreVertical, Crown, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NativeYouTubePlayerProps {
  videoId: string;
  onProgress: (seconds: number) => void;
  onComplete: () => void;
  requiredWatchTime: number;
  videoData?: any;
}

export default function NativeYouTubePlayer({
  videoId,
  onProgress,
  onComplete,
  requiredWatchTime,
  videoData
}: NativeYouTubePlayerProps) {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create native YouTube URL with authenticated session
  const createNativeYouTubeURL = () => {
    const baseUrl = `https://www.youtube.com/embed/${videoId}`;
    
    const params = new URLSearchParams({
      // Native YouTube experience - all features enabled
      autoplay: '1',
      controls: '1',           // Full YouTube controls
      modestbranding: '0',     // Full YouTube branding and UI
      rel: '1',                // Show related videos
      showinfo: '1',           // Show video title and uploader info
      iv_load_policy: '1',     // Load annotations by default
      cc_load_policy: '1',     // Load closed captions
      fs: '1',                 // Enable fullscreen
      disablekb: '0',          // Enable keyboard shortcuts
      playsinline: '0',        // Don't force inline (allow fullscreen)
      
      // JavaScript API for interaction tracking
      enablejsapi: '1',
      origin: window.location.origin,
      
      // Quality and ads - no restrictions
      html5: '1',
      vq: 'auto',
      
      // Ensure ads are NOT blocked or restricted
      // Remove any ad-blocking parameters
    });

    return `${baseUrl}?${params.toString()}`;
  };

  // Timer for watch progress
  const startWatchTimer = () => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      setWatchSeconds(prev => {
        const newSeconds = prev + 1;
        onProgress(newSeconds);
        
        // Check if required watch time is completed
        if (newSeconds >= requiredWatchTime) {
          stopWatchTimer();
          onComplete();
        }
        
        return newSeconds;
      });
    }, 1000);
  };

  const stopWatchTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Listen for YouTube player messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from YouTube
      if (!event.origin.includes('youtube.com')) return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'video-progress') {
          // YouTube is playing
          if (!isPlaying) {
            setIsPlaying(true);
            startWatchTimer();
          }
        } else if (data.event === 'video-pause') {
          // YouTube is paused
          setIsPlaying(false);
          stopWatchTimer();
        } else if (data.event === 'video-ended') {
          // Video ended
          setIsPlaying(false);
          stopWatchTimer();
          onComplete();
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      stopWatchTimer();
    };
  }, [isPlaying, onComplete]);

  // YouTube engagement actions using authenticated session
  const handleLike = async () => {
    try {
      const response = await fetch('/api/youtube/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      
      if (response.ok) {
        const result = await response.json();
        setHasLiked(true);
        setHasDisliked(false);
        
        toast({
          title: result.youtubeSync ? "✅ Liked on YouTube!" : "👍 Like Recorded",
          description: result.youtubeSync 
            ? `Your like was synced to YouTube! (+${result.bonusCoins} coins)` 
            : `Like recorded locally. Connect YouTube in Account settings for real sync. (+${result.bonusCoins} coins)`,
        });
        
        console.log('📝 Like result:', result);
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  const handleDislike = async () => {
    try {
      const response = await fetch('/api/youtube/dislike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      
      if (response.ok) {
        const result = await response.json();
        setHasDisliked(true);
        setHasLiked(false);
        
        toast({
          title: result.youtubeSync ? "❌ Disliked on YouTube" : "👎 Dislike Recorded",
          description: result.youtubeSync 
            ? "Your dislike was synced to YouTube!" 
            : "Dislike recorded locally. Connect YouTube in Account settings for real sync.",
        });
        
        console.log('📝 Dislike result:', result);
      }
    } catch (error) {
      console.error('Error disliking video:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!videoData?.channelId) return;
    
    try {
      const endpoint = hasSubscribed ? '/api/youtube/unsubscribe' : '/api/youtube/subscribe';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: videoData.channelId })
      });
      
      if (response.ok) {
        const result = await response.json();
        setHasSubscribed(!hasSubscribed);
        
        const action = hasSubscribed ? 'unsubscribed from' : 'subscribed to';
        toast({
          title: result.youtubeSync ? `✅ ${hasSubscribed ? 'Unsubscribed' : 'Subscribed'} on YouTube!` : `${hasSubscribed ? 'Unsubscribed' : 'Subscribed'}`,
          description: result.youtubeSync 
            ? `You have ${action} this channel on YouTube!` 
            : `${hasSubscribed ? 'Unsubscription' : 'Subscription'} recorded locally. Connect YouTube in Account settings for real sync.`,
        });
        
        console.log('📝 Subscription result:', result);
      }
    } catch (error) {
      console.error('Error with subscription:', error);
    }
  };

  const handleShare = () => {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    if (navigator.share) {
      navigator.share({
        title: videoData?.title || 'YouTube Video',
        url: videoUrl,
      });
    } else {
      navigator.clipboard.writeText(videoUrl);
      toast({
        title: "Link Copied!",
        description: "Video URL copied to clipboard.",
      });
    }
  };

  const openInYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  const formatViewCount = (count: number | string) => {
    const num = typeof count === 'string' ? parseInt(count) : count;
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  const formatSubscriberCount = (count: number | string) => {
    const num = typeof count === 'string' ? parseInt(count) : count;
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="bg-black text-white">
      {/* YouTube Player - Full Native Experience */}
      <div className="relative aspect-video bg-black">
        <iframe
          ref={iframeRef}
          src={createNativeYouTubeURL()}
          title="YouTube video player"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; camera; microphone"
          allowFullScreen
          style={{ border: 'none' }}
        />
        
        {/* Progress overlay */}
        <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1 rounded-lg text-sm">
          {watchSeconds}s / {requiredWatchTime}s required
        </div>
      </div>

      {/* Video Information - YouTube Style */}
      {videoData && (
        <div className="p-4 space-y-4">
          {/* Title */}
          <h1 className="text-lg md:text-xl font-semibold leading-tight">
            {videoData.title}
          </h1>

          {/* View count and date */}
          <div className="flex items-center text-gray-400 text-sm space-x-2">
            <span>{formatViewCount(videoData.viewCount || 0)} views</span>
            <span>•</span>
            <span>{videoData.publishedTimeText || 'Recently published'}</span>
          </div>

          {/* Channel info and actions */}
          <div className="flex items-center justify-between">
            {/* Channel */}
            <div className="flex items-center space-x-3 flex-1">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage src={videoData.channelThumbnail} alt={videoData.channelTitle} />
                <AvatarFallback className="text-xs">{videoData.channelTitle?.charAt(0) || 'C'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm md:text-base truncate">{videoData.channelTitle}</div>
                <div className="text-gray-400 text-xs md:text-sm">
                  {formatSubscriberCount(videoData.subscriberCount || 0)} subscribers
                </div>
              </div>
              <Button
                onClick={handleSubscribe}
                variant={hasSubscribed ? "secondary" : "default"}
                size="sm"
                className={`rounded-full text-xs md:text-sm px-3 py-1 md:px-4 md:py-2 ${
                  hasSubscribed 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {hasSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Like/Dislike */}
              <div className="flex items-center bg-gray-800 rounded-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`rounded-l-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm ${
                    hasLiked ? 'text-blue-400' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <ThumbsUp className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                  {formatViewCount(videoData.likeCount || 0)}
                </Button>
                
                <div className="w-px h-4 md:h-6 bg-gray-600"></div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDislike}
                  className={`rounded-r-full px-2 py-1 md:px-4 md:py-2 ${
                    hasDisliked ? 'text-red-400' : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <ThumbsDown className={`h-3 w-3 md:h-4 md:w-4 ${hasDisliked ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Share */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="bg-gray-800 hover:bg-gray-700 rounded-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm"
              >
                <Share2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Share
              </Button>

              {/* Save */}
              <Button
                variant="ghost"
                size="sm"
                className="bg-gray-800 hover:bg-gray-700 rounded-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm"
              >
                <Bookmark className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Save
              </Button>
            </div>

            {/* Open in YouTube */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openInYouTube}
              className="bg-gray-800 hover:bg-gray-700 rounded-full px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm"
            >
              <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              YouTube
            </Button>
          </div>

          {/* Watch progress indicator */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Watch Progress</span>
              <Badge variant="outline" className="bg-green-900/30 border-green-600 text-green-400">
                <Coins className="w-3 h-3 mr-1" />
                Earn {requiredWatchTime} coins
              </Badge>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((watchSeconds / requiredWatchTime) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {watchSeconds} / {requiredWatchTime} seconds
            </div>
          </div>
        </div>
      )}
    </div>
  );
}