import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Coins, Heart, MessageCircle, Eye, Clock, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EnhancedVideoPlayerProps {
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

export default function EnhancedVideoPlayer({ job, onClose, onComplete }: EnhancedVideoPlayerProps) {
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
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const playerRef = useRef<HTMLDivElement>(null);
  const visibilityRef = useRef<IntersectionObserver>();

  // Fetch video metadata and stats from YouTube API
  const { data: videoData } = useQuery({
    queryKey: ['/api/youtube/video', job.video?.youtubeId],
    enabled: !!job.video?.youtubeId
  });

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
    };
  }, []);

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
    }

    return () => {
      if (visibilityRef.current) {
        visibilityRef.current.disconnect();
      }
    };
  }, []);

  const initializePlayer = useCallback(() => {
    if (!playerRef.current || player) return;

    const newPlayer = new window.YT.Player(playerRef.current, {
      height: '100%',
      width: '100%',
      videoId: job.video?.youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        start: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          setPlayer(event.target);
          startCountdown();
        },
        onStateChange: (event: any) => {
          const state = event.data;
          setIsPlaying(state === window.YT.PlayerState.PLAYING);
          
          // Prevent seeking and other cheat attempts
          if (state === window.YT.PlayerState.BUFFERING || 
              state === window.YT.PlayerState.CUED) {
            const currentTime = event.target.getCurrentTime();
            if (currentTime > watchSeconds + 5) {
              // User tried to skip ahead significantly
              event.target.seekTo(watchSeconds, true);
              toast({
                title: "Invalid Action",
                description: "Please watch the video normally to earn coins.",
                variant: "destructive",
              });
            }
          }
        }
      }
    });
  }, [job.video?.youtubeId, player, watchSeconds]);

  const startCountdown = () => {
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          if (player) {
            player.playVideo();
          }
          startWatchTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startWatchTimer = () => {
    intervalRef.current = setInterval(() => {
      if (player && isVideoVisible && isPlaying) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        
        setWatchSeconds(prev => {
          const newSeconds = Math.floor(currentTime);
          const progress = (newSeconds / job.watchSecondsRequired) * 100;
          setWatchProgress(Math.min(progress, 100));
          
          // Calculate coins earned in real-time
          const earned = Math.floor((newSeconds / job.watchSecondsRequired) * job.watchSecondsRequired);
          setCoinsEarned(earned);

          // Auto-complete when requirement met
          if (newSeconds >= job.watchSecondsRequired && !isCompleted) {
            completeWatchMutation.mutate();
          }

          return newSeconds;
        });
      }
    }, 1000);
  };

  const completeWatchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/watch/complete", {
        jobId: job.id,
        watchSeconds,
        sessionData: {
          sessionId: Date.now().toString(),
          userAgent: navigator.userAgent,
          finalCoinsEarned: coinsEarned,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsCompleted(true);
      toast({
        title: "🎉 Watch Completed!",
        description: `You earned ${data.coinsEarned} coins!`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/account/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watch/available"] });
      
      if (onComplete) {
        setTimeout(() => onComplete(), 2000);
      } else {
        setTimeout(() => onClose(), 3000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Like video functionality
  const likeVideoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/youtube/like", {
        videoId: job.video?.youtubeId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video Liked!",
        description: "Your like has been recorded.",
      });
    }
  });

  const handleClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (player) {
      player.destroy();
    }
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <Card className="bg-white dark:bg-gray-900 shadow-2xl">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-2 pr-4">
                  {job.video?.title || "Loading..."}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                  {videoData && (
                    <>
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {videoData.channelTitle}
                      </span>
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {formatViews(videoData.viewCount)} views
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTimeAgo(videoData.publishedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button variant="ghost" onClick={handleClose} className="shrink-0">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Video Player Container */}
            <div className="bg-black rounded-xl mb-6 relative aspect-video overflow-hidden">
              <div ref={playerRef} className="absolute inset-0 w-full h-full" />
              
              {/* Countdown Overlay */}
              {showCountdown && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-center animate-pulse">
                    <div className="text-6xl font-bold text-white mb-4">{countdown}</div>
                    <div className="text-white text-xl">Get ready to watch...</div>
                  </div>
                </div>
              )}

              {/* Boost Badge */}
              {job.video?.boostLevel > 0 && (
                <div className="absolute top-4 right-4 z-20">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    {job.video.boostLevel}x BOOSTED
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => likeVideoMutation.mutate()}
                  disabled={likeVideoMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Heart className="h-4 w-4" />
                  <span>Like</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Comment</span>
                </Button>
              </div>
              
              {!isVideoVisible && (
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                  Video not visible - progress paused
                </div>
              )}
            </div>

            {/* Watch Progress & Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Progress Section */}
              <div className="md:col-span-2 space-y-4">
                <Card className="bg-gray-50 dark:bg-gray-800 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Watch Progress
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {watchProgress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={watchProgress} 
                      className="h-3 mb-3" 
                    />
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <span>Required: {formatDuration(job.watchSecondsRequired)}</span>
                      <span>Watched: {formatDuration(watchSeconds)}</span>
                    </div>
                  </CardContent>
                </Card>

                {isCompleted && (
                  <Card className="bg-green-50 border-green-200 animate-fadeIn">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">🎉</div>
                      <h3 className="font-semibold text-green-900 mb-1">Congratulations!</h3>
                      <p className="text-green-700">Watch completed successfully!</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Stats Panel */}
              <div className="space-y-4">
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Coins className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-yellow-900">Coins Earned</h3>
                        <div className="text-2xl font-bold text-yellow-800">
                          {coinsEarned}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-yellow-700">
                      Earn {job.watchSecondsRequired} coins when complete
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Play Stats</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Current Time:</span>
                        <span className="font-medium">{formatDuration(watchSeconds)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Progress:</span>
                        <span className="font-medium">{watchProgress.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Status:</span>
                        <span className={`font-medium ${isPlaying ? 'text-green-600' : 'text-red-600'}`}>
                          {isPlaying ? 'Playing' : 'Paused'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}