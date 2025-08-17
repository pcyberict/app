import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Heart, Share2, ThumbsUp, ArrowLeft, Crown, Star, Clock, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnailUrl?: string;
  durationSeconds: number;
}

interface WatchJob {
  id: string;
  video: Video;
  watchSecondsRequired: number;
  status: string;
}

export default function EnhancedStreamingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Player and timing state
  const [player, setPlayer] = useState<any>(null);
  const [currentJob, setCurrentJob] = useState<WatchJob | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  
  // UI state
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  
  // Refs
  const playerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityRef = useRef<IntersectionObserver | null>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(true);

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ["/api/account/balance"],
    refetchInterval: 2000
  });

  const currentBalance = balanceData?.balance || 0;

  // Fetch available jobs
  const { data: availableJobs, isLoading } = useQuery({
    queryKey: ["/api/watch/available"],
    enabled: true,
    refetchInterval: 5000
  });

  // Initialize with first job when available
  useEffect(() => {
    if (availableJobs && Array.isArray(availableJobs) && availableJobs.length > 0 && !currentJob) {
      const sortedJobs = [...availableJobs].sort((a, b) => {
        const getBoostPriority = (job: any) => {
          if (job.video?.boostLevel === 5) return 5;
          if (job.video?.boostLevel === 2) return 2;
          return 1;
        };
        return getBoostPriority(b) - getBoostPriority(a);
      });
      
      const firstJob = sortedJobs[0];
      setCurrentJob(firstJob);
      assignWatchMutation.mutate(firstJob.id);
    }
  }, [availableJobs, currentJob]);

  // Assign watching job
  const assignWatchMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", "/api/watch/assign", { jobId });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log("Job assigned successfully:", data);
      setCurrentJobId(data.id);
      setShowCountdown(true);
      setCountdown(3);
      
      toast({
        title: "Video Ready!",
        description: "Starting video playback...",
      });
    },
    onError: (error: any) => {
      console.error("Error assigning watch job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start watching video. Please try again.",
        variant: "destructive"
      });
      setTimeout(() => setLocation("/watch-queue"), 2000);
    }
  });

  // Complete video watching
  const completeWatchMutation = useMutation({
    mutationFn: async (data: { jobId: string; watchSeconds: number; sessionData?: any }) => {
      const response = await apiRequest("POST", "/api/watch/complete", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      const earnedCoins = data?.coinsEarned || Math.floor(watchSeconds);
      setCoinsEarned(earnedCoins);
      
      queryClient.invalidateQueries({ queryKey: ["/api/account/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watch/available"] });
      
      toast({
        title: "🎉 Video Completed!",
        description: `Earned ${earnedCoins} coins! Great job watching!`,
        duration: 4000,
      });

      // Auto-advance to next video after delay
      setTimeout(() => {
        handleNextVideo();
      }, 3000);
    },
    onError: (error: any) => {
      console.error("Error completing watch:", error);
      toast({
        title: "Error",
        description: "Failed to complete video watch. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleNextVideo = () => {
    // Reset state for next video
    setWatchProgress(0);
    setWatchSeconds(0);
    setCoinsEarned(0);
    setIsCompleted(false);
    setHasLiked(false);
    setHasSubscribed(false);
    setHasShared(false);
    setCurrentJobId(null);
    setCurrentJob(null);
    
    if (player) {
      player.destroy();
      setPlayer(null);
    }
    
    // Reload available jobs
    queryClient.invalidateQueries({ queryKey: ["/api/watch/available"] });
  };

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!currentJob?.video?.youtubeId) return;

    const initializeYouTubeAPI = () => {
      if (!window.YT) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.body.appendChild(script);

        window.onYouTubeIframeAPIReady = () => {
          setTimeout(() => initializePlayer(), 1000);
        };
      } else {
        initializePlayer();
      }
    };

    initializeYouTubeAPI();

    return () => {
      if (player) {
        try {
          player.destroy();
        } catch (e) {
          console.warn("Error destroying player:", e);
        }
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentJob]);

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
        setTimeout(() => {
          try {
            player.playVideo();
          } catch (e) {
            console.warn("Error starting video:", e);
          }
        }, 500);
      }
    }
  }, [countdown, showCountdown, player]);

  // Initialize Intersection Observer
  useEffect(() => {
    if (playerRef.current) {
      visibilityRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsVideoVisible(entry.isIntersecting && entry.intersectionRatio > 0.7);
        },
        { threshold: 0.7 }
      );

      visibilityRef.current.observe(playerRef.current);

      return () => {
        if (visibilityRef.current) {
          visibilityRef.current.disconnect();
        }
      };
    }
  }, [currentJob]);

  const initializePlayer = useCallback(() => {
    if (!playerRef.current || !currentJob?.video?.youtubeId || !window.YT) return;

    try {
      const newPlayer = new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: currentJob.video.youtubeId,
        playerVars: {
          autoplay: 0, // Start paused for countdown
          controls: 0, // Disable playback controls
          disablekb: 1, // Disable keyboard controls
          fs: 0, // Disable fullscreen
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          start: 0,
          loop: 0,
          autohide: 1
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            console.log("YouTube player ready");
          },
          onStateChange: (event: any) => {
            const state = event.data;
            setIsPlaying(state === window.YT.PlayerState.PLAYING);
            
            console.log("YouTube player state changed:", state);
            
            if (state === window.YT.PlayerState.PLAYING && !showCountdown) {
              startWatchTimer();
            } else if (state !== window.YT.PlayerState.PLAYING) {
              stopWatchTimer();
            }

            if (state === window.YT.PlayerState.ENDED) {
              handleVideoEnd();
            }
          },
          onError: (event: any) => {
            console.error("YouTube player error:", event.data);
            toast({
              title: "Video Error",
              description: "There was an error loading this video. Skipping to next...",
              variant: "destructive"
            });
            setTimeout(() => handleNextVideo(), 2000);
          }
        }
      });
    } catch (error) {
      console.error("Error initializing YouTube player:", error);
      toast({
        title: "Player Error",
        description: "Failed to initialize video player. Please try again.",
        variant: "destructive"
      });
    }
  }, [currentJob, showCountdown]);

  const startWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    console.log("Starting watch timer for video:", currentJob?.video?.youtubeId);
    intervalRef.current = setInterval(() => {
      if (isVideoVisible && player && !showCountdown) {
        try {
          const playerState = player.getPlayerState();
          if (playerState === window.YT.PlayerState.PLAYING) {
            setWatchSeconds(prev => {
              const newSeconds = prev + 1;
              const requiredSeconds = currentJob?.watchSecondsRequired || 54;
              
              // Progress bar moves based on required watch seconds
              const progress = Math.min((newSeconds / requiredSeconds) * 100, 100);
              setWatchProgress(progress);
              
              console.log(`Watch progress: ${newSeconds}/${requiredSeconds}s (${progress.toFixed(1)}%)`);

              // Complete video when required time is reached
              if (newSeconds >= requiredSeconds && !isCompleted) {
                console.log("Video watch requirement completed!");
                setTimeout(() => handleVideoEnd(), 100);
                return newSeconds;
              }

              return newSeconds;
            });
          }
        } catch (e) {
          console.warn("Error in watch timer:", e);
        }
      }
    }, 1000);
  }, [isVideoVisible, player, currentJob, showCountdown, isCompleted]);

  const stopWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (isCompleted || !currentJobId || !currentJob) return;
    
    const requiredSeconds = currentJob?.watchSecondsRequired || 54;
    
    // Only complete if user has watched the required duration
    if (watchSeconds >= requiredSeconds) {
      setIsCompleted(true);
      stopWatchTimer();
      
      completeWatchMutation.mutate({
        jobId: currentJobId,
        watchSeconds: Math.max(watchSeconds, requiredSeconds),
        sessionData: {
          sessionId: `session_${Date.now()}`,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          videoId: currentJob?.video?.youtubeId,
          engagements: {
            liked: hasLiked,
            subscribed: hasSubscribed,
            shared: hasShared
          }
        }
      });
    }
  }, [watchSeconds, currentJob, currentJobId, isCompleted, completeWatchMutation, stopWatchTimer, hasLiked, hasSubscribed, hasShared]);

  // Engagement handlers
  const handleLike = async () => {
    if (!hasLiked && currentJob?.video?.youtubeId) {
      setHasLiked(true);
      
      toast({
        title: "Video Liked! ❤️",
        description: "Your like has been recorded. Earning bonus engagement points!",
        duration: 3000,
      });
    }
  };

  const handleSubscribe = async () => {
    if (!hasSubscribed) {
      setHasSubscribed(true);
      
      toast({
        title: "Subscribed! 🔔",
        description: "Your subscription has been recorded. Earning bonus engagement points!",
        duration: 3000,
      });
    }
  };

  const handleShare = async () => {
    if (!hasShared) {
      setHasShared(true);
      
      // Copy video URL to clipboard
      const videoUrl = `https://www.youtube.com/watch?v=${currentJob?.video?.youtubeId}`;
      try {
        await navigator.clipboard.writeText(videoUrl);
        toast({
          title: "Video Shared! 🔗",
          description: "Video URL copied to clipboard. Earning bonus engagement points!",
          duration: 3000,
        });
      } catch (error) {
        toast({
          title: "Video Shared! 🔗",
          description: "Your share action has been recorded. Earning bonus engagement points!",
          duration: 3000,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">No Videos Available</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              There are currently no videos in the watch queue.
            </p>
            <Button onClick={() => setLocation("/watch-queue")} className="w-full">
              Go to Watch Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiredSeconds = currentJob?.watchSecondsRequired || 54;
  const remainingSeconds = Math.max(0, requiredSeconds - watchSeconds);
  const isPremium = user?.role === 'premium';
  const baseReward = 60;
  const premiumBonus = isPremium ? Math.floor(baseReward * 0.5) : 0;
  const totalReward = baseReward + premiumBonus;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/watch-queue")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Queue
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 px-3 py-1.5 rounded-full">
              <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-amber-800 dark:text-amber-200">
                {currentBalance.toLocaleString()}
              </span>
            </div>
            
            {isPremium && (
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-200">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Video Player Container */}
      <div className="relative">
        {/* Countdown Overlay */}
        {showCountdown && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl font-bold mb-4 animate-pulse">
                {countdown}
              </div>
              <p className="text-xl">Video starting in...</p>
            </div>
          </div>
        )}

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          <div ref={playerRef} className="w-full h-full" />
        </div>

        {/* Video Controls Overlay */}
        {!showCountdown && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={hasLiked}
                  className={`flex items-center gap-2 text-white hover:bg-white/20 ${hasLiked ? 'text-red-400' : ''}`}
                >
                  <ThumbsUp className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                  Like
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSubscribe}
                  disabled={hasSubscribed}
                  className={`flex items-center gap-2 text-white hover:bg-white/20 ${hasSubscribed ? 'text-red-400' : ''}`}
                >
                  <User className="h-4 w-4" />
                  Subscribe
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  disabled={hasShared}
                  className={`flex items-center gap-2 text-white hover:bg-white/20 ${hasShared ? 'text-blue-400' : ''}`}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Watch Progress & Rewards */}
      <div className="p-4 space-y-4">
        {/* Video Title */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {currentJob.video.title}
          </h1>
        </div>

        {/* Progress Card */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <span>Watch Progress</span>
                  <span>{watchSeconds}s / {requiredSeconds}s</span>
                </div>
                <Progress value={watchProgress} className="h-3" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 mb-1">
                    <Coins className="h-4 w-4" />
                    <span className="text-sm">Coins</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentBalance.toLocaleString()}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Play Time</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {remainingSeconds} <span className="text-sm font-normal">Seconds</span>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <Star className="h-4 w-4" />
                    <span className="text-sm">Reward</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {totalReward} <span className="text-sm font-normal">Coins</span>
                  </div>
                </div>
              </div>

              {/* Premium Bonus */}
              {isPremium && (
                <div className="text-center text-sm text-purple-600 dark:text-purple-400 font-medium">
                  50% more rewards for premium members
                </div>
              )}

              {/* Completion Status */}
              {isCompleted && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-4 py-2 rounded-full">
                    <Star className="h-4 w-4" />
                    Video Completed! Earned {coinsEarned} coins
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}