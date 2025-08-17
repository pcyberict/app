import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Coins, Heart, MessageCircle, Eye, Clock, User, ArrowLeft, ThumbsUp, Share2, Flag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StreamingPageProps {
  job: any;
  onClose: () => void;
  onComplete?: () => void;
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function StreamingPage({ job, onClose, onComplete }: StreamingPageProps) {
  const { toast } = useToast();
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const playerRef = useRef<HTMLDivElement>(null);
  const visibilityRef = useRef<IntersectionObserver>();

  // Fetch current balance
  const { data: balanceData } = useQuery({
    queryKey: ["/api/account/balance"]
  });

  useEffect(() => {
    if (balanceData?.balance) {
      setCurrentBalance(balanceData.balance);
    }
  }, [balanceData]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    return () => {
      if (player) {
        player.destroy();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      if (player) {
        player.playVideo();
      }
    }
  }, [countdown, showCountdown, player]);

  // Initialize Intersection Observer to track visibility
  useEffect(() => {
    if (playerRef.current) {
      visibilityRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsVideoVisible(entry.isIntersecting && entry.intersectionRatio > 0.5);
        },
        { threshold: 0.5 }
      );

      visibilityRef.current.observe(playerRef.current);

      return () => {
        if (visibilityRef.current) {
          visibilityRef.current.disconnect();
        }
      };
    }
  }, []);

  const initializePlayer = useCallback(() => {
    if (!playerRef.current || !job.video?.youtubeId) return;

    const newPlayer = new window.YT.Player(playerRef.current, {
      height: '100%',
      width: '100%',
      videoId: job.video.youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 0, // Disable YouTube controls
        disablekb: 1, // Disable keyboard controls
        fs: 0, // Disable fullscreen
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        start: 0
      },
      events: {
        onReady: (event: any) => {
          setPlayer(event.target);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING && !showCountdown) {
            setIsPlaying(true);
            startWatchTracking();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            stopWatchTracking();
          } else if (event.data === window.YT.PlayerState.ENDED) {
            handleVideoEnd();
          }
        }
      }
    });
  }, [job.video?.youtubeId, showCountdown]);

  const startWatchTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      if (isVideoVisible && isPlaying) {
        setWatchSeconds(prev => {
          const newSeconds = prev + 1;
          const newCoins = Math.min(newSeconds, job.watchSecondsRequired);
          const progress = Math.min((newSeconds / job.watchSecondsRequired) * 100, 100);
          
          setCoinsEarned(newCoins);
          setWatchProgress(progress);
          
          // Complete when required watch time is reached
          if (newSeconds >= job.watchSecondsRequired && !isCompleted) {
            setIsCompleted(true);
            completeWatchMutation.mutate({
              jobId: job.id,
              watchSeconds: newSeconds,
              sessionData: {
                sessionId: Date.now().toString(),
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
              }
            });
          }
          
          return newSeconds;
        });
      }
    }, 1000);
  };

  const stopWatchTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleVideoEnd = () => {
    if (!isCompleted && watchSeconds < job.watchSecondsRequired) {
      toast({
        title: "Watch time incomplete",
        description: `Please watch at least ${job.watchSecondsRequired} seconds to earn coins.`,
        variant: "destructive",
      });
    }
  };

  const completeWatchMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/watch/complete", data);
      return response.json();
    },
    onSuccess: (data) => {
      stopWatchTracking();
      setCurrentBalance(prev => prev + data.coinsEarned);
      toast({
        title: "🎉 Coins Earned!",
        description: `You earned ${data.coinsEarned} coins! Great job!`,
      });
      
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between text-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/10"
          data-testid="button-close-streaming"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Queue
        </Button>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-yellow-400" />
            <span className="font-bold text-yellow-400">{currentBalance}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            data-testid="button-close-player"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video Player Container */}
      <div className="flex-1 relative">
        <div 
          ref={playerRef} 
          className="w-full h-full"
          data-testid="youtube-player"
        />
        
        {/* Countdown Overlay */}
        {showCountdown && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-8xl font-bold mb-4 animate-pulse">
                {countdown}
              </div>
              <p className="text-xl">Starting video in...</p>
            </div>
          </div>
        )}

        {/* Completion Overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center text-white bg-green-600 p-8 rounded-xl shadow-2xl">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
              <p className="text-lg mb-4">You earned {coinsEarned} coins!</p>
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Stats Panel */}
      <div className="bg-white dark:bg-gray-900 p-4 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          {/* Video Info */}
          <div className="flex items-start space-x-4 mb-4">
            <img 
              src={job.video?.thumbnailUrl || `https://img.youtube.com/vi/${job.video?.youtubeId}/maxresdefault.jpg`}
              alt="Video thumbnail"
              className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
            />
            
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2">
                {job.video?.title || "Video Title"}
              </h3>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {job.video?.channelTitle || 'Unknown Channel'}
                </span>
                {job.video?.viewCount && (
                  <span className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    {formatViews(job.video.viewCount)} views
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Like
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <Flag className="h-4 w-4 mr-1" />
                  Report
                </Button>
              </div>
            </div>
          </div>

          {/* Progress Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Coins */}
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                  {currentBalance}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Coins</div>
              </CardContent>
            </Card>

            {/* Play Time */}
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {Math.min(watchSeconds, job.watchSecondsRequired)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  / {job.watchSecondsRequired} Seconds
                </div>
              </CardContent>
            </Card>

            {/* Reward */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                  +{coinsEarned}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Coins Earned</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Watch Progress
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {watchProgress.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={watchProgress} 
              className="h-3 bg-gray-200 dark:bg-gray-700"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {isCompleted ? "✅ Completed!" : `${Math.max(0, job.watchSecondsRequired - watchSeconds)}s remaining`}
            </div>
          </div>

          {/* Premium Member Bonus */}
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-700 dark:text-purple-300">
                💎 50% more rewards for premium members
              </span>
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                Upgrade
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}