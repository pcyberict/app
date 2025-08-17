import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X, Coins, Heart, MessageCircle, Eye, Clock, User, Play, Pause, ExternalLink, Volume2, VolumeX, Crown, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FixedVideoPlayerProps {
  job: any;
  onClose: () => void;
  onComplete?: () => void;
}

export default function FixedVideoPlayer({ job, onClose, onComplete }: FixedVideoPlayerProps) {
  const { toast } = useToast();
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [videoPlayerUrl, setVideoPlayerUrl] = useState<string>('');
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const visibilityRef = useRef<IntersectionObserver>();

  // Fetch authenticated YouTube session
  const { data: youtubeSession, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['/api/youtube/watch', job?.video?.youtubeId],
    enabled: !!job?.video?.youtubeId,
    retry: false
  });

  // Fetch video metadata
  const { data: videoData } = useQuery({
    queryKey: ['/api/youtube/video', job?.video?.youtubeId],
    enabled: !!job?.video?.youtubeId
  });

  // Complete watch mutation
  const completeWatchMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/watch/complete', {
        jobId: job?.id,
        watchSeconds: watchSeconds,
        sessionData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
      setIsCompleted(true);
      
      // Auto-advance to next video after a short delay
      if (onComplete) {
        setTimeout(onComplete, 1500);
      }
    },
    onError: (error: any) => {
      console.error("Watch completion error:", error);
      // Still mark as completed locally if backend fails
      setIsCompleted(true);
      if (onComplete) {
        setTimeout(onComplete, 1500);
      }
    }
  });

  // Like video mutation with YouTube API integration
  const likeVideoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/youtube/like', {
        videoId: job?.video?.youtubeId
      });
    },
    onSuccess: (data: any) => {
      setHasLiked(true);
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
      toast({
        title: "Like Recorded!",
        description: `+${data.bonusCoins} bonus coins earned! Like sent to YouTube.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to like video",
        variant: "destructive",
      });
    }
  });

  // Initialize video player URL when session is ready
  useEffect(() => {
    if (youtubeSession && !sessionLoading && !sessionError) {
      setSessionData(youtubeSession);
      
      // Enhanced URL with disabled controls, autoplay off initially, and related videos disabled
      const baseUrl = youtubeSession?.embedUrl || '';
      const enhancedUrl = `${baseUrl}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&playsinline=1&enablejsapi=1&autoplay=0&end=${job?.watchSecondsRequired || 60}`;
      setVideoPlayerUrl(enhancedUrl);
      
      startCountdown();
    }
  }, [youtubeSession, sessionLoading, sessionError]);

  // Initialize intersection observer for visibility tracking
  useEffect(() => {
    if (iframeRef.current) {
      visibilityRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsVideoVisible(entry.isIntersecting && entry.intersectionRatio > 0.5);
        },
        { threshold: 0.5 }
      );

      visibilityRef.current.observe(iframeRef.current);
    }

    return () => {
      if (visibilityRef.current) {
        visibilityRef.current.disconnect();
      }
    };
  }, []);

  const startCountdown = useCallback(() => {
    setShowCountdown(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          startWatchTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    console.log("Starting watch timer for video:", job?.video?.youtubeId);
    intervalRef.current = setInterval(() => {
      if (isVideoVisible && !isCompleted) {
        setWatchSeconds(prev => {
          const newSeconds = prev + 1;
          const requiredSeconds = job?.watchSecondsRequired || 60;
          const progress = Math.min((newSeconds / requiredSeconds) * 100, 100);
          setWatchProgress(progress);
          setCoinsEarned(newSeconds);

          // Auto-complete when required time is reached
          if (newSeconds >= requiredSeconds && !isCompleted) {
            // Stop the video by clearing the URL
            setVideoPlayerUrl('');
            
            // Complete the watch immediately
            completeWatchMutation.mutate();
            
            // Clear the timer
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            
            return newSeconds;
          }

          return newSeconds;
        });
      }
    }, 1000);
  }, [isVideoVisible, isCompleted, job?.watchSecondsRequired, completeWatchMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleLikeVideo = () => {
    if (!hasLiked) {
      likeVideoMutation.mutate();
    }
  };

  const handleOpenInYouTube = () => {
    window.open(sessionData?.directUrl || `https://www.youtube.com/watch?v=${job?.video?.youtubeId}`, '_blank');
  };

  const handleIframeError = () => {
    setVideoPlayerUrl('');
  };

  const getBoostDisplay = () => {
    const boostLevel = job?.video?.boostLevel || 0;
    if (boostLevel >= 5) return { text: "5X BOOST", icon: Crown, color: "bg-yellow-500" };
    if (boostLevel >= 2) return { text: "2X BOOST", icon: Sparkles, color: "bg-blue-500" };
    return null;
  };

  const boost = getBoostDisplay();

  if (sessionLoading) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white">Loading video session...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center text-red-400">
              <p>Failed to load video session</p>
              <Button onClick={onClose} className="mt-4">Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black relative">
      {/* Countdown Overlay */}
      {showCountdown && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="text-white text-center max-w-sm">
            <div className="text-6xl md:text-8xl font-bold mb-4 animate-pulse text-red-500">
              {countdown}
            </div>
            <p className="text-lg md:text-xl mb-2">Get ready to watch and earn!</p>
            <div className="mt-4 text-sm md:text-base opacity-75 line-clamp-2">
              {videoData?.title || job?.video?.title || 'Loading...'}
            </div>
            <div className="mt-2 text-xs md:text-sm opacity-60">
              Watch for {job?.watchSecondsRequired || 60} seconds to earn coins
            </div>
          </div>
        </div>
      )}

      {/* Like Animation */}
      {showLikeAnimation && (
        <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
          <div className="animate-ping">
            <Heart className="h-16 w-16 md:h-24 md:w-24 text-red-500 fill-current" />
          </div>
          <div className="absolute animate-bounce text-white text-sm md:text-lg font-bold">
            +5 Bonus Coins!
          </div>
        </div>
      )}

      {/* Single Unified Layout for All Devices */}
      <div className="min-h-screen flex flex-col max-w-7xl mx-auto">
        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black flex-shrink-0">
          {videoPlayerUrl ? (
            <iframe
              ref={iframeRef}
              src={videoPlayerUrl}
              className="w-full h-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={false}
              onError={handleIframeError}
              onLoad={() => console.log('Video iframe loaded successfully')}
              data-testid="video-player-iframe"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white">
              <div className="text-center p-6 max-w-sm">
                <Play className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Video Embedding Restricted</h3>
                <p className="text-sm mb-4">Click below to watch on YouTube.</p>
                <Button
                  onClick={handleOpenInYouTube}
                  className="bg-white text-red-600 hover:bg-gray-100"
                  size="sm"
                  data-testid="button-open-youtube"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in YouTube
                </Button>
                <p className="text-xs mt-3 opacity-90">
                  Keep this window open and return after {job?.watchSecondsRequired || 60}s to earn coins
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 md:p-4">
            <div className="mb-2">
              <Progress value={watchProgress} className="h-2 md:h-3 bg-gray-700" />
            </div>
            <div className="flex justify-between items-center text-white text-xs md:text-sm">
              <span>{watchSeconds}s / {job?.watchSecondsRequired || 60}s</span>
              <span className="text-yellow-400 font-bold">+{coinsEarned} coins</span>
            </div>
          </div>
        </div>

        {/* Compact Controls Panel */}
        <div className="flex-1 bg-gray-900 text-white p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              <span className="font-semibold text-sm md:text-base">Watching & Earning</span>
              {boost && (
                <Badge className={`${boost.color} text-white text-xs`}>
                  <boost.icon className="w-3 h-3 mr-1" />
                  {boost.text}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              data-testid="button-close-player"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Authentication Status */}
          {sessionData?.isAuthenticated && (
            <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-100">
                  Logged in as {sessionData.userName}
                </span>
              </div>
            </div>
          )}

          {/* Video Info */}
          <div className="space-y-2 md:space-y-3">
            <h3 className="font-semibold text-base md:text-lg leading-tight line-clamp-2">
              {videoData?.title || job?.video?.title || 'Loading...'}
            </h3>
            <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm text-gray-400">
              <span className="truncate">{videoData?.channelTitle || 'Unknown Channel'}</span>
              <span className="flex items-center flex-shrink-0">
                <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {videoData?.viewCount?.toLocaleString() || '0'} views
              </span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-gray-800/50 rounded-lg p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Watch Progress</span>
              <span className="font-bold text-green-400">
                <Coins className="w-4 h-4 inline mr-1" />
                +{coinsEarned} coins
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{watchSeconds}s watched</span>
              <span>{job?.watchSecondsRequired || 60}s required</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleLikeVideo}
              disabled={hasLiked || likeVideoMutation.isPending}
              variant={hasLiked ? "default" : "outline"}
              size="sm"
              className={`${hasLiked 
                ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                : "border-gray-600 text-white hover:bg-red-500 hover:border-red-500"
              }`}
              data-testid="button-like-video"
            >
              <Heart className={`w-4 h-4 mr-1 ${hasLiked ? "fill-current" : ""}`} />
              {hasLiked ? "Liked!" : "Like"}
            </Button>
            
            <Button
              onClick={handleOpenInYouTube}
              variant="outline"
              size="sm"
              className="border-gray-600 text-white hover:bg-blue-500 hover:border-blue-500"
              data-testid="button-open-youtube-side"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              YouTube
            </Button>
          </div>

          {/* Completion Status */}
          {isCompleted && (
            <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4 text-center">
              <Badge className="bg-green-500 text-white mb-2">
                <Coins className="w-4 h-4 mr-1" />
                Completed! +{job?.watchSecondsRequired || 0} coins
              </Badge>
              <p className="text-sm text-green-100">
                Great job! Moving to next video...
              </p>
            </div>
          )}

          {/* Visibility Warning */}
          {!isVideoVisible && !showCountdown && (
            <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3">
              <p className="text-yellow-100 text-sm flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Video must be visible to earn coins. Keep this window active.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}