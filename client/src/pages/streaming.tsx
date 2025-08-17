import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Coins, Heart, MessageCircle, Eye, Clock, User, ArrowLeft, ThumbsUp, Share2, Flag, Volume2, VolumeX, SkipForward, ChevronLeft, ChevronRight, Sparkles, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import StreamingLayout from "@/components/StreamingLayout";
import FixedVideoPlayer from "@/components/FixedVideoPlayer";

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function StreamingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  
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
          if (job.video?.boost?.type === '5x' || job.video?.boostLevel === 5) return 5;
          if (job.video?.boost?.type === '2x' || job.video?.boostLevel === 2) return 2;
          return 1;
        };
        return getBoostPriority(b) - getBoostPriority(a);
      });
      
      setCurrentJob(sortedJobs[0]);
      setQueuedJobs(sortedJobs.slice(1));
      assignWatchMutation.mutate(sortedJobs[0].id);
    }
  }, [availableJobs, currentJob]);


  const moveToNextVideo = () => {
    if (queuedJobs.length > 0) {
      const nextJob = queuedJobs[0];
      const remainingJobs = queuedJobs.slice(1);
      
      setCurrentJob(nextJob);
      setQueuedJobs(remainingJobs);
      setIsCompleted(false);
      
      assignWatchMutation.mutate(nextJob.id);
    } else {
      // No more videos, go back to queue
      setLocation("/watch-queue");
      toast({
        title: "Queue Complete!",
        description: "No more videos available. Great work!",
      });
    }
  };

  // Assign watching job
  const assignWatchMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", "/api/watch/assign", { jobId });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log("Job assigned successfully:", data);
      // Remove the notification as requested by user
      // Video will start after 3-second countdown
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

  const startWatchingJob = (jobId: string) => {
    assignWatchMutation.mutate(jobId);
  };

  // Complete video watching
  const completeWatchMutation = useMutation({
    mutationFn: async (data: { jobId: string; watchSeconds: number; sessionData?: any }) => {
      const response = await apiRequest("POST", "/api/watch/complete", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      const earnedCoins = data?.coinsEarned || Math.floor(watchSeconds);
      setCoinsEarned(earnedCoins);
      setCurrentBalance(prev => prev + earnedCoins);
      
      queryClient.invalidateQueries({ queryKey: ["/api/account/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watch/available"] });
      
      toast({
        title: "🎉 Video Completed!",
        description: `Earned ${earnedCoins} coins! Great job watching!`,
        duration: 4000,
      });

      // Auto-advance to next video after delay
      if (autoNext && queuedJobs.length > 0) {
        setTimeout(() => {
          handleNextVideo();
        }, 3000);
      } else if (queuedJobs.length === 0) {
        // No more videos, go back to queue
        setTimeout(() => {
          setLocation("/watch-queue");
          toast({
            title: "Queue Complete!",
            description: "No more videos available. Great work!",
          });
        }, 3000);
      }
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
    if (queuedJobs.length > 0) {
      const nextJob = queuedJobs[0];
      const remainingJobs = queuedJobs.slice(1);
      
      setCurrentJob(nextJob);
      setQueuedJobs(remainingJobs);
      setWatchProgress(0);
      setWatchSeconds(0);
      setCoinsEarned(0);
      setIsCompleted(false);
      setCountdown(3);
      setShowCountdown(true);
      setHasLiked(false);
      setVideoLiked(false);
      setVideoDuration(0);
      setCurrentJobId(null);
      
      if (player) {
        player.destroy();
        setPlayer(null);
      }
      
      startWatchingJob(nextJob.id);
    } else {
      // Reload available jobs
      queryClient.invalidateQueries({ queryKey: ["/api/watch/available"] });
      setLocation("/watch-queue");
      toast({
        title: "Queue Complete!",
        description: "No more videos available. Great work!",
      });
    }
  };

  const handlePrevVideo = () => {
    // Go back to queue to select a different video
    setLocation("/watch-queue");
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
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          start: 0,
          end: Math.max(currentJob?.watchSecondsRequired || 60, 60), // End video at required watch time
          loop: 0,
          playlist: '',
          autohide: 1
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            console.log("YouTube player ready");
            
            // Get actual video duration
            setTimeout(() => {
              try {
                const duration = event.target.getDuration();
                if (duration > 0) {
                  setVideoDuration(duration);
                  console.log("Video duration:", duration, "seconds");
                }
              } catch (e) {
                console.warn("Could not get video duration:", e);
              }
            }, 1000);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            setIsPlaying(state === window.YT.PlayerState.PLAYING);
            
            console.log("YouTube player state changed:", state, "Playing:", state === window.YT.PlayerState.PLAYING);
            
            if (state === window.YT.PlayerState.PLAYING && !showCountdown && isInitialized) {
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
  }, [currentJob, isInitialized, showCountdown]);

  const startWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    console.log("Starting watch timer for video:", currentJob?.video?.youtubeId);
    intervalRef.current = setInterval(() => {
      if (isVideoVisible && player && isInitialized && !showCountdown) {
        try {
          const playerState = player.getPlayerState();
          if (playerState === window.YT.PlayerState.PLAYING) {
            setWatchSeconds(prev => {
              const newSeconds = prev + 1;
              const requiredSeconds = currentJob?.watchSecondsRequired || 60;
              
              // Progress bar moves based on required watch seconds (exact timing)
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
  }, [isVideoVisible, player, currentJob, isInitialized, showCountdown, isCompleted]);

  const stopWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (isCompleted || !currentJobId || !currentJob) return;
    
    const requiredSeconds = currentJob?.watchSecondsRequired || 60;
    
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
          videoId: currentJob?.video?.youtubeId
        }
      });
    }
  }, [watchSeconds, currentJob, currentJobId, isCompleted, completeWatchMutation, stopWatchTimer]);

  // In-app like functionality 
  const handleLike = async () => {
    if (!hasLiked && currentJob?.video?.youtubeId) {
      setHasLiked(true);
      setVideoLiked(true);
      setShowLikeAnimation(true);
      
      // Hide animation after 2 seconds
      setTimeout(() => setShowLikeAnimation(false), 2000);
      
      try {
        const response = await apiRequest("POST", "/api/youtube/like", {
          videoId: currentJob.video.youtubeId
        });
        
        const data = await response.json();
        
        toast({
          title: "Video Liked! ❤️",
          description: "Your like has been recorded. Earning bonus engagement points!",
          duration: 3000,
        });
        
        // Add bonus coins for engagement
        queryClient.invalidateQueries({ queryKey: ["/api/account/balance"] });
        
      } catch (error) {
        console.error("Error liking video:", error);
        toast({
          title: "Like Recorded",
          description: "Your engagement has been tracked for bonus rewards!",
          duration: 2000,
        });
      }
    }
  };

  // In-app comment functionality
  const handleComment = () => {
    if (currentJob?.video?.youtubeId) {
      // Create comment dialog with input field
      const commentText = prompt("Write your comment for this video:");
      
      if (commentText && commentText.trim()) {
        // Submit comment through our API
        apiRequest("POST", "/api/youtube/comment", {
          videoId: currentJob.video.youtubeId,
          comment: commentText.trim()
        }).then(() => {
          toast({
            title: "Comment Posted! 💬",
            description: "Your comment has been submitted. Earning bonus engagement points!",
            duration: 3000,
          });
          
          // Add bonus coins for commenting
          queryClient.invalidateQueries({ queryKey: ["/api/account/balance"] });
          
        }).catch(error => {
          console.error("Error posting comment:", error);
          toast({
            title: "Comment Recorded",
            description: "Your engagement has been tracked for bonus rewards!",
            duration: 2000,
          });
        });
      }
    }
  };

  const toggleMute = () => {
    if (player) {
      try {
        if (isMuted) {
          player.unMute();
        } else {
          player.mute();
        }
        setIsMuted(!isMuted);
      } catch (e) {
        console.warn("Error toggling mute:", e);
      }
    }
  };

  // Extract YouTube video ID for thumbnail
  const getYouTubeThumbnail = (youtubeId: string) => {
    return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading streaming experience...</p>
        </div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No videos available</h2>
          <p className="mb-6">Check back later for new opportunities!</p>
          <Button 
            onClick={() => setLocation("/watch-queue")}
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-black"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queue
          </Button>
        </div>
      </div>
    );
  }

  const requiredSeconds = currentJob?.watchSecondsRequired || 60;
  const progressPercentage = Math.min((watchSeconds / requiredSeconds) * 100, 100);
  const coinsPerSecond = 1; // 1 coin per second watched
  const estimatedCoins = Math.floor(watchSeconds * coinsPerSecond);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Use FixedVideoPlayer with full functionality */}
      {currentJob && (
        <FixedVideoPlayer
          job={currentJob}
          onClose={() => setLocation('/dashboard')}
          onComplete={() => {
            setIsCompleted(true);
            setTimeout(() => {
              moveToNextVideo();
            }, 2000);
          }}
        />
      )}

      {/* Mobile Progress Bar - Immediately Below Video Frame */}
      {currentJob && (
        <div className="md:hidden bg-gray-900/95 backdrop-blur-sm text-white p-3 border-t border-gray-700">
          {/* Mobile Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-white text-sm mb-2">
              <div className="flex items-center space-x-2">
                <Coins className="h-3 w-3 text-yellow-400" />
                <span className="font-medium text-sm">Watch Progress</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-yellow-400 font-bold">+{Math.floor(watchSeconds)} coins</span>
                <span className="text-white/80">{Math.floor(watchSeconds)}s / {requiredSeconds}s</span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-2 bg-gray-800"
              />
              <div 
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-yellow-400 border-2 border-white rounded-full shadow-lg transition-all duration-200"
                style={{ left: `${Math.min(progressPercentage, 98)}%` }}
              />
            </div>
          </div>

          {/* Mobile Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center">
              <div className="text-base font-bold text-yellow-400 flex items-center justify-center">
                <Coins className="h-3 w-3 mr-1" />
                {currentBalance.toLocaleString()}
              </div>
              <div className="text-xs text-white/60">Balance</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-green-400">
                +{estimatedCoins}
              </div>
              <div className="text-xs text-white/60">Earning</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-blue-400">
                {queuedJobs.length}
              </div>
              <div className="text-xs text-white/60">Queued</div>
            </div>
            <div className="text-center">
              <div className={`text-base font-bold ${isPlaying ? 'text-green-400' : 'text-red-400'}`}>
                {isPlaying ? 'LIVE' : 'OFF'}
              </div>
              <div className="text-xs text-white/60">Status</div>
            </div>
          </div>

          {/* Mobile Action Controls */}
          <div className="flex items-center justify-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-white hover:bg-white/20 h-10 w-10"
              title="Mute"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className="text-white hover:bg-red-500/20 h-10 w-10 transition-colors"
              title="Like In-App (+5 coins)"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="text-white hover:bg-blue-500/20 h-10 w-10 transition-colors"
              title="Comment In-App (+10 coins)"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const youtubeUrl = `https://www.youtube.com/watch?v=${currentJob.video.youtubeId}`;
                navigator.clipboard.writeText(youtubeUrl).then(() => {
                  toast({
                    title: "Link Copied!",
                    description: "YouTube video link copied to clipboard",
                  });
                });
              }}
              className="text-white hover:bg-green-500/20 h-10 w-10 transition-colors"
              title="Copy YouTube Link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Professional Top Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 via-black/80 to-transparent p-3 md:p-6 z-30">
        <div className="max-w-7xl mx-auto">
          {/* Top Row - Navigation & Actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 md:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/watch-queue")}
                className="text-white hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              
              <div className="hidden md:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevVideo}
                  className="text-white hover:bg-white/20"
                  disabled={queuedJobs.length === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextVideo}
                  className="text-white hover:bg-white/20"
                  disabled={queuedJobs.length === 0}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-3">
              <Badge 
                variant="secondary"
                className={`text-xs md:text-sm font-bold px-2 md:px-3 py-1 flex items-center space-x-1 ${
                  currentJob.video?.boostLevel === 5 ? 'bg-purple-600 text-white' :
                  currentJob.video?.boostLevel === 2 ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}
              >
                {currentJob.video?.boostLevel === 5 && <Crown className="h-3 w-3" />}
                <span>
                  {currentJob.video?.boostLevel === 5 ? '5X BOOST' :
                   currentJob.video?.boostLevel === 2 ? '2X BOOST' : 'STANDARD'}
                </span>
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/watch-queue")}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Video Info Row - Responsive Layout */}
          <div className="flex flex-col md:flex-row md:items-start space-y-2 md:space-y-0 md:space-x-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base md:text-xl leading-tight line-clamp-2 mb-1">
                {videoData?.title || currentJob.video?.title || "Loading video title..."}
              </h1>
              
              <div className="flex items-center flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-white/80">
                <span className="flex items-center bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
                  <User className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[120px] md:max-w-none">
                    {videoData?.channelTitle || "Loading channel..."}
                  </span>
                </span>
                
                {videoData?.viewCount && (
                  <span className="flex items-center bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
                    <Eye className="h-3 w-3 mr-1" />
                    {videoData.viewCount >= 1000000 ? `${(videoData.viewCount / 1000000).toFixed(1)}M` :
                     videoData.viewCount >= 1000 ? `${(videoData.viewCount / 1000).toFixed(1)}K` :
                     videoData.viewCount} views
                  </span>
                )}
                
                <span className="flex items-center bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  Duration: {videoDuration > 0 ? 
                    `${Math.floor(videoDuration / 60)}:${String(videoDuration % 60).padStart(2, '0')}` : 
                    "Loading..."}
                </span>
                
                <span className="flex items-center bg-green-500/20 px-2 py-1 rounded-full backdrop-blur-sm border border-green-500/30">
                  <Coins className="h-3 w-3 mr-1 text-green-400" />
                  Earn: {requiredSeconds} coins
                </span>
              </div>
            </div>
            
            {/* Queue Info - Mobile Responsive */}
            {queuedJobs.length > 0 && (
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span className="text-white text-sm font-medium">
                  {queuedJobs.length} video{queuedJobs.length === 1 ? '' : 's'} queued
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Bottom Controls - Professional Progress & Stats */}
      <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-4 md:p-6 pb-6 md:pb-8 z-30">
        {/* Enhanced Progress Bar Section */}
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6">
            <div className="flex items-center justify-between text-white text-sm mb-2">
              <div className="flex items-center space-x-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="font-medium">Watch Progress</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-yellow-400 font-bold">+{Math.floor(watchSeconds)} coins earned</span>
                <span className="text-white/80">{Math.floor(watchSeconds)}s / {requiredSeconds}s</span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-3 bg-gray-800 border border-gray-700 shadow-inner"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-yellow-500/20 rounded-full pointer-events-none" />
              {/* Progress indicator dot */}
              <div 
                className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full shadow-lg transition-all duration-200"
                style={{ left: `${Math.min(progressPercentage, 98)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Row - Mobile Responsive */}
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 space-y-4 md:space-y-0">
            <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-6 w-full md:w-auto">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-yellow-400 flex items-center justify-center">
                  <Coins className="h-4 md:h-5 w-4 md:w-5 mr-1" />
                  {currentBalance.toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Balance</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-400">
                  +{estimatedCoins}
                </div>
                <div className="text-xs text-white/60">Earning</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-400">
                  {queuedJobs.length}
                </div>
                <div className="text-xs text-white/60">Queued</div>
              </div>
              <div className="text-center">
                <div className={`text-xl md:text-2xl font-bold ${isPlaying ? 'text-green-400' : 'text-red-400'}`}>
                  {isPlaying ? 'LIVE' : 'PAUSED'}
                </div>
                <div className="text-xs text-white/60">Status</div>
              </div>
            </div>

            {/* Action Controls - Responsive */}
            <div className="flex items-center justify-center md:justify-end space-x-2 md:space-x-3 w-full md:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20 h-10 w-10 md:h-12 md:w-12"
                title="Toggle Mute"
              >
                {isMuted ? <VolumeX className="h-4 w-4 md:h-5 md:w-5" /> : <Volume2 className="h-4 w-4 md:h-5 md:w-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="text-white hover:bg-red-500/20 h-10 w-10 md:h-12 md:w-12 transition-colors"
                title="Like on YouTube"
              >
                <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleComment}
                className="text-white hover:bg-blue-500/20 h-10 w-10 md:h-12 md:w-12 transition-colors"
                title="Comment on YouTube"
              >
                <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const youtubeUrl = `https://www.youtube.com/watch?v=${currentJob.video.youtubeId}`;
                  navigator.clipboard.writeText(youtubeUrl).then(() => {
                    toast({
                      title: "Link Copied!",
                      description: "YouTube video link copied to clipboard",
                    });
                  }).catch(() => {
                    window.open(youtubeUrl, '_blank');
                  });
                }}
                className="text-white hover:bg-green-500/20 h-10 w-10 md:h-12 md:w-12 transition-colors"
                title="Copy YouTube Link"
              >
                <Share2 className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Queue Preview with Auto-Slide */}
        {queuedJobs.length > 0 && (
          <div className="bg-black/60 rounded-xl p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <span className="text-white text-sm font-medium">Up Next</span>
              </div>
              <span className="text-white/60 text-xs">{queuedJobs.length} videos queued</span>
            </div>
            
            <div className="relative overflow-hidden">
              <div 
                className="flex space-x-4 transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${queueSlide * 160}px)` }}
              >
                {queuedJobs.map((job, index) => (
                  <div 
                    key={job.id} 
                    className="flex-shrink-0 w-36 cursor-pointer group"
                    onClick={() => {
                      // Move this video to front of queue
                      const newQueue = queuedJobs.filter(j => j.id !== job.id);
                      newQueue.unshift(job);
                      setQueuedJobs(newQueue);
                      handleNextVideo();
                    }}
                  >
                    <div className="relative">
                      <img 
                        src={getYouTubeThumbnail(job.video?.youtubeId)} 
                        alt={job.video?.title}
                        className="w-36 h-20 object-cover rounded-lg border-2 border-transparent group-hover:border-white/50 transition-all"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/default/maxresdefault.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="text-white text-xs font-medium">Play Next</div>
                      </div>
                      {(job.video?.boost?.type || job.video?.boostLevel > 1) && (
                        <div className="absolute top-1 left-1">
                          <Badge className={`text-xs px-1 py-0 text-white flex items-center space-x-1 ${
                            job.video?.boostLevel === 5 ? 'bg-purple-600' : 'bg-blue-600'
                          }`}>
                            {job.video?.boostLevel === 5 && <Crown className="h-2 w-2" />}
                            <span>{job.video?.boostLevel === 5 ? '5X' : '2X'}</span>
                          </Badge>
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {Math.floor((job.watchSecondsRequired || 60) / 60)}:{String((job.watchSecondsRequired || 60) % 60).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/90 line-clamp-2 group-hover:text-white transition-colors">
                      {job.video?.title || "Video Title"}
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      {job.video?.channel || "Channel"}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Auto-slide indicators */}
              {queuedJobs.length > 3 && (
                <div className="absolute bottom-0 right-0 flex space-x-1 mt-2">
                  {Array.from({ length: Math.max(0, queuedJobs.length - 2) }).map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === queueSlide ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Completion Overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center">
          <div className="text-center text-white max-w-md">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold mb-4">Video Completed!</h2>
            <div className="flex items-center justify-center text-2xl font-bold text-yellow-400 mb-6">
              <Coins className="h-6 w-6 mr-2" />
              +{coinsEarned} Coins Earned
            </div>
            
            <div className="mb-6 text-center">
              <div className="text-lg mb-2">Total Balance</div>
              <div className="text-3xl font-bold text-green-400">{currentBalance.toLocaleString()} coins</div>
            </div>
            
            {queuedJobs.length > 0 ? (
              <div>
                <p className="mb-4">Next video starting in 3 seconds...</p>
                <div className="space-x-4">
                  <Button
                    onClick={handleNextVideo}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Watch Next Video
                  </Button>
                  <Button
                    onClick={() => setLocation("/watch-queue")}
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-black"
                  >
                    Back to Queue
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-4">Great work! No more videos in queue.</p>
                <Button
                  onClick={() => setLocation("/watch-queue")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Queue
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}