import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowLeft, Crown, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import NativeYouTubePlayer from "@/components/NativeYouTubePlayer";
import { useYouTubeData } from "@/hooks/useYouTubeData";

// Helper function to format published time
function formatPublishedTime(publishedAt: string): string {
  const publishedDate = new Date(publishedAt);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

// Simplified types for native YouTube experience

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

export default function ImprovedStreamingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Simplified state for native YouTube experience
  const [currentJob, setCurrentJob] = useState<WatchJob | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ["/api/account/balance"],
    refetchInterval: 2000
  });

  const currentBalance = (balanceData as any)?.balance || 0;

  // Fetch real YouTube data for current video
  const { data: youtubeData, isLoading: youtubeLoading, error: youtubeError } = useYouTubeData(currentJob?.video?.youtubeId);
  
  // Log YouTube data fetching
  useEffect(() => {
    if (currentJob?.video?.youtubeId) {
      console.log('🎥 Current video YouTube ID:', currentJob.video.youtubeId);
    }
    if (youtubeData) {
      console.log('📊 COMPLETE YOUTUBE DATA LOADED:', {
        title: youtubeData.title,
        channelTitle: youtubeData.channelTitle,
        viewCount: youtubeData.viewCount,
        likeCount: youtubeData.likeCount,
        subscriberCount: youtubeData.subscriberCount,
        duration: youtubeData.duration,
        publishedAt: youtubeData.publishedAt,
        description: youtubeData.description?.substring(0, 100) + '...'
      });
    }
    if (youtubeError) {
      console.error('❌ YouTube data error:', youtubeError);
    }
  }, [currentJob?.video?.youtubeId, youtubeData, youtubeError]);

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
      
      // Start countdown instead of showing notification
      setCountdown(3);
      setShowCountdown(true);
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
    // Reset all state for next video
    setWatchProgress(0);
    setWatchSeconds(0);
    setCoinsEarned(0);
    setIsCompleted(false);
    setIsInitialized(false);
    setHasLiked(false);
    setHasDisliked(false);
    setHasSubscribed(false);
    setHasShared(false);
    setHasSaved(false);
    setCurrentJobId(null);
    setCurrentJob(null);
    setCountdown(3);
    setShowCountdown(false);
    
    if (player) {
      try {
        player.destroy();
      } catch (e) {
        console.warn("Error destroying player:", e);
      }
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

  // Countdown timer effect
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      // Start the video after countdown
      if (player && isInitialized) {
        player.playVideo();
      }
    }
  }, [countdown, showCountdown, player, isInitialized]);

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
          autoplay: 0, // Don't autoplay - wait for countdown
          controls: 1, // Show YouTube controls
          disablekb: 0, // Allow keyboard controls
          fs: 1, // Allow fullscreen
          modestbranding: 0, // Show YouTube branding
          rel: 1, // Show related videos
          showinfo: 1, // Show video info
          iv_load_policy: 1, // Load annotations
          cc_load_policy: 1, // Load captions
          playsinline: 0, // Don't force inline playback
          origin: window.location.origin,
          enablejsapi: 1,
          start: 0,
          loop: 0,
          autohide: 0, // Don't hide controls
          // Allow ads by not restricting anything
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            console.log("YouTube player ready");
            setIsInitialized(true);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            setIsPlaying(state === window.YT.PlayerState.PLAYING);
            
            console.log("YouTube player state changed:", state);
            
            if (state === window.YT.PlayerState.PLAYING && isInitialized) {
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
  }, [currentJob, isInitialized]);

  const startWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    console.log("Starting watch timer for video:", currentJob?.video?.youtubeId);
    intervalRef.current = setInterval(() => {
      if (isVideoVisible && player && isInitialized) {
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
  }, [isVideoVisible, player, currentJob, isInitialized, isCompleted]);

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
            disliked: hasDisliked,
            subscribed: hasSubscribed,
            shared: hasShared,
            saved: hasSaved
          }
        }
      });
    }
  }, [watchSeconds, currentJob, currentJobId, isCompleted, completeWatchMutation, stopWatchTimer, hasLiked, hasDisliked, hasSubscribed, hasShared, hasSaved]);

  // Engagement handlers
  const handleLike = () => {
    if (!hasLiked) {
      setHasLiked(true);
      if (hasDisliked) setHasDisliked(false);
      
      toast({
        title: "Video Liked!",
        description: "Your like has been recorded. Earning bonus engagement points!",
        duration: 2000,
      });
    }
  };

  const handleDislike = () => {
    if (!hasDisliked) {
      setHasDisliked(true);
      if (hasLiked) setHasLiked(false);
      
      toast({
        title: "Video Disliked",
        description: "Your feedback has been recorded.",
        duration: 2000,
      });
    }
  };

  const handleSubscribe = () => {
    if (!hasSubscribed) {
      setHasSubscribed(true);
      
      toast({
        title: "Subscribed!",
        description: "Your subscription has been recorded. Earning bonus engagement points!",
        duration: 2000,
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
          title: "Video Shared!",
          description: "Video URL copied to clipboard. Earning bonus engagement points!",
          duration: 2000,
        });
      } catch (error) {
        toast({
          title: "Video Shared!",
          description: "Your share action has been recorded. Earning bonus engagement points!",
          duration: 2000,
        });
      }
    }
  };

  const handleSave = () => {
    if (!hasSaved) {
      setHasSaved(true);
      
      toast({
        title: "Video Saved!",
        description: "Video saved to your watch later list. Earning bonus engagement points!",
        duration: 2000,
      });
    }
  };

  if (isLoading || youtubeLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-300">{youtubeLoading ? 'Loading YouTube data...' : 'Loading videos...'}</p>
        </div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 bg-gray-900 border-gray-700">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4 text-white">No Videos Available</h2>
            <p className="text-gray-300 mb-4">
              There are currently no videos in the watch queue.
            </p>
            <Button onClick={() => setLocation("/watch-queue")} className="w-full bg-red-600 hover:bg-red-700">
              Go to Watch Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiredSeconds = currentJob?.watchSecondsRequired || 54;
  const remainingSeconds = Math.max(0, requiredSeconds - watchSeconds);
  const isPremium = (user as any)?.role === 'premium';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* YouTube-style Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/watch-queue")}
              className="text-white hover:bg-gray-800 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {/* YouTube Logo */}
            <div className="flex items-center gap-1">
              <div className="bg-red-600 rounded px-1 py-0.5">
                <span className="text-white font-bold text-sm">▶</span>
              </div>
              <span className="text-white font-bold text-xl">YouTube</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span className="font-semibold text-white">
                {currentBalance.toLocaleString()}
              </span>
            </div>
            
            {isPremium && (
              <Badge variant="secondary" className="bg-purple-800 text-purple-200">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Video Player Container with Countdown */}
        <div className="relative">
          <NativeYouTubePlayer
            videoId={currentJob.video.youtubeId}
            onProgress={(seconds) => setWatchSeconds(seconds)}
            onComplete={handleVideoEnd}
            requiredWatchTime={requiredSeconds}
            videoData={{
              title: youtubeData?.title || currentJob.video.title,
              channelTitle: youtubeData?.channelTitle || currentJob.video.channelTitle || 'YouTube Channel',
              channelThumbnail: youtubeData?.channelThumbnail || currentJob.video.channelThumbnail || '',
              viewCount: youtubeData?.viewCount || currentJob.video.viewCount || 1000,
              likeCount: youtubeData?.likeCount || currentJob.video.likeCount || 50,
              subscriberCount: youtubeData?.subscriberCount || currentJob.video.subscriberCount || 1000,
              publishedTimeText: youtubeData?.publishedAt ? formatPublishedTime(youtubeData.publishedAt) : currentJob.video.publishedTimeText || 'Recently',
              channelId: youtubeData?.channelId || currentJob.video.channelId || ''
            }}
          />
          
          {/* Countdown Overlay */}
          {showCountdown && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
              <div className="text-center text-white">
                <div className="text-8xl font-bold mb-4 animate-pulse">
                  {countdown}
                </div>
                <p className="text-xl">Starting video in...</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Watch Progress Card */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Progress Info */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">Watch Progress</span>
                  <span className="text-white font-medium">{watchSeconds}s / {requiredSeconds}s</span>
                </div>
                
                {/* Progress Bar */}
                <Progress 
                  value={watchProgress} 
                  className="h-2 bg-gray-800"
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2 text-yellow-400 mb-1">
                      <Coins className="h-4 w-4" />
                      <span className="text-xs">Coins</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {currentBalance.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Play Time</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {remainingSeconds} <span className="text-xs font-normal">Seconds</span>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
                      <Coins className="h-4 w-4" />
                      <span className="text-xs">Reward</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      60 <span className="text-xs font-normal">Coins</span>
                    </div>
                  </div>
                </div>

                {/* Premium Bonus */}
                {isPremium && (
                  <div className="text-center text-sm text-purple-400 font-medium">
                    50% more rewards for premium members
                  </div>
                )}

                {/* Completion Status */}
                {isCompleted && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-green-800 text-green-200 px-4 py-2 rounded-full">
                      <Coins className="h-4 w-4" />
                      Video Completed! Earned {coinsEarned} coins
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}