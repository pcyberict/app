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

// YouTube player types
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

  // Player states
  const [player, setPlayer] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // Watch tracking states
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [watchProgress, setWatchProgress] = useState(0);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  // Interaction states
  const [videoLiked, setVideoLiked] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);

  const playerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get available watch jobs
  const { data: availableJobs = [] } = useQuery({
    queryKey: ['/api/watch/available'],
    refetchInterval: 10000,
  });

  // Get account balance
  const { data: accountData = {} } = useQuery({
    queryKey: ['/api/account/balance'],
    refetchInterval: 5000,
  });

  const jobsArray = Array.isArray(availableJobs) ? availableJobs : [];
  const currentJob = jobsArray.find((job: any) => job.videoId === currentJobId) || jobsArray[0];
  const queuedJobs = jobsArray.filter((job: any) => job.videoId !== currentJobId);
  const currentBalance = (accountData as any)?.balance || 0;

  // Complete watch mutation
  const completeWatchMutation = useMutation({
    mutationFn: ({ jobId, watchSeconds }: { jobId: string; watchSeconds: number }) =>
      apiRequest(`/api/watch/complete`, 'POST', { jobId, watchSeconds }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watch-history'] });
      
      toast({
        title: "Video Completed!",
        description: `You earned ${data.coinsEarned} coins!`
      });
    }
  });

  const likeVideoMutation = useMutation({
    mutationFn: ({ jobId }: { jobId: string }) =>
      apiRequest(`/api/watch/like`, 'POST', { jobId }),
    onSuccess: () => {
      setVideoLiked(true);
      setHasLiked(true);
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 2000);
      
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
      toast({
        title: "Liked!",
        description: "You earned bonus coins for liking!"
      });
    }
  });

  const commentVideoMutation = useMutation({
    mutationFn: ({ jobId }: { jobId: string }) =>
      apiRequest(`/api/watch/comment`, 'POST', { jobId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
      toast({
        title: "Thanks for commenting!",
        description: "You earned bonus coins!"
      });
    }
  });

  // Fetch YouTube video data
  useEffect(() => {
    if (currentJob?.video?.youtubeId) {
      fetch(`/api/youtube/video/${currentJob.video.youtubeId}`)
        .then(res => res.json())
        .then(data => {
          setVideoData(data);
          console.log("Fetched YouTube data:", data);
        })
        .catch(err => {
          console.error("Failed to fetch YouTube data:", err);
        });
    }
  }, [currentJob?.video?.youtubeId]);

  const handleNextVideo = useCallback(() => {
    if (queuedJobs.length > 0) {
      const nextJob = queuedJobs[0];
      setCurrentJobId(nextJob.videoId);
      setWatchSeconds(0);
      setWatchProgress(0);
      setIsCompleted(false);
    } else {
      setLocation("/watch-queue");
    }
  }, [queuedJobs, setLocation]);

  const handleVideoEnd = useCallback(() => {
    if (isCompleted || !currentJobId || !currentJob) return;
    
    const requiredSeconds = currentJob?.watchSecondsRequired || 60;
    
    // Only complete if user has watched the required duration
    if (watchSeconds >= requiredSeconds) {
      setIsCompleted(true);
      
      completeWatchMutation.mutate({
        jobId: currentJobId,
        watchSeconds: watchSeconds
      });
      
      // Auto-proceed to next video after 2 seconds
      setTimeout(() => {
        handleNextVideo();
      }, 2000);
    }
  }, [currentJob, currentJobId, watchSeconds, isCompleted, completeWatchMutation, handleNextVideo]);

  // Initialize YouTube API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        setIsInitialized(true);
      };
    } else if (window.YT) {
      setIsInitialized(true);
    }

    const handleVisibilityChange = () => {
      setIsVideoVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    setIsVideoVisible(!document.hidden);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const initializePlayer = useCallback(() => {
    if (!isInitialized || !playerRef.current || !currentJob?.video?.youtubeId) {
      console.log("Not ready to initialize player:", { isInitialized, hasPlayerRef: !!playerRef.current, hasVideoId: !!currentJob?.video?.youtubeId });
      return;
    }

    // Clean up existing player
    if (player) {
      try {
        player.destroy();
      } catch (e) {
        console.warn("Error destroying existing player:", e);
      }
      setPlayer(null);
    }

    // Clear the container
    if (playerRef.current) {
      playerRef.current.innerHTML = '';
    }

    console.log("Initializing YouTube player for video:", currentJob.video.youtubeId);

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
          loop: 0,
          playlist: '',
          autohide: 1
        },
        events: {
          onReady: (event: any) => {
            console.log("YouTube player ready for video:", currentJob.video.youtubeId);
            setPlayer(event.target);
            
            // Get video duration
            setTimeout(() => {
              try {
                const duration = event.target.getDuration();
                console.log("Video duration:", duration);
                setVideoDuration(duration || currentJob.watchSecondsRequired || 60);
              } catch (e) {
                console.warn("Could not get video duration:", e);
                setVideoDuration(currentJob.watchSecondsRequired || 60);
              }
            }, 1000);
            
            setCurrentJobId(currentJob.videoId);
            setWatchSeconds(0);
            setWatchProgress(0);
            setIsCompleted(false);
            setVideoLiked(false);
            setHasLiked(false);
            
            // Start countdown
            setShowCountdown(true);
            setCountdown(3);
            
            const countdownInterval = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  setShowCountdown(false);
                  // Start playing after countdown
                  try {
                    event.target.playVideo();
                  } catch (e) {
                    console.warn("Could not start video:", e);
                  }
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            setIsPlaying(state === window.YT.PlayerState.PLAYING);
            
            console.log("YouTube player state changed:", state, "Playing:", state === window.YT.PlayerState.PLAYING);
            
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
            let errorMessage = "There was an issue loading this video.";
            
            switch (event.data) {
              case 2:
                errorMessage = "Invalid video ID or video not found.";
                break;
              case 5:
                errorMessage = "Video cannot be played in embedded players.";
                break;
              case 100:
                errorMessage = "Video not found or private.";
                break;
              case 101:
              case 150:
                errorMessage = "Video owner has disabled embedding.";
                break;
              default:
                errorMessage = "Video loading failed. Please try another video.";
            }
            
            toast({
              title: "Video Error",
              description: errorMessage,
              variant: "destructive"
            });
            
            // Skip to next video after error
            setTimeout(() => {
              if (queuedJobs.length > 0) {
                handleNextVideo();
              } else {
                setLocation("/watch-queue");
              }
            }, 3000);
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
  }, [currentJob, isInitialized, player, toast, handleNextVideo, queuedJobs, setLocation]);

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
  }, [isVideoVisible, player, currentJob, isInitialized, showCountdown, isCompleted, handleVideoEnd]);

  const stopWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handlePrevVideo = useCallback(() => {
    if (queuedJobs.length > 1) {
      const prevJob = queuedJobs[queuedJobs.length - 1];
      setCurrentJobId(prevJob.videoId);
      setWatchSeconds(0);
      setWatchProgress(0);
      setIsCompleted(false);
    }
  }, [queuedJobs]);

  const handleLike = useCallback(() => {
    if (!hasLiked && currentJobId) {
      likeVideoMutation.mutate({ jobId: currentJobId });
    }
  }, [currentJobId, hasLiked, likeVideoMutation]);

  const handleComment = useCallback(() => {
    if (currentJobId) {
      commentVideoMutation.mutate({ jobId: currentJobId });
    }
  }, [currentJobId, commentVideoMutation]);

  const toggleMute = useCallback(() => {
    if (player) {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  }, [player, isMuted]);

  // Initialize player when ready
  useEffect(() => {
    if (currentJob && isInitialized) {
      initializePlayer();
    }
  }, [currentJob, initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <CardContent>
            <p className="text-center">Please log in to start watching videos.</p>
            <Button
              onClick={() => setLocation("/login")}
              className="w-full mt-4"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="mb-6">
            <Coins className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Videos Available</h2>
            <p className="text-white/80">Check back later for new videos to watch!</p>
          </div>
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
  const actualDuration = videoDuration > 0 ? videoDuration : requiredSeconds;
  const progressPercentage = Math.min((watchSeconds / actualDuration) * 100, 100);
  const coinsPerSecond = 1; // 1 coin per second watched
  const estimatedCoins = Math.floor(watchSeconds * coinsPerSecond);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Countdown Overlay */}
      {showCountdown && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-8xl font-bold mb-4 animate-pulse text-red-500">
              {countdown}
            </div>
            <p className="text-2xl mb-2">Get ready to watch and earn!</p>
            <div className="mt-4 text-lg opacity-75 max-w-md">
              {currentJob.video?.title}
            </div>
            <div className="mt-2 text-sm opacity-60">
              Watch for {requiredSeconds} seconds to earn coins
            </div>
          </div>
        </div>
      )}

      {/* Like Animation */}
      {showLikeAnimation && (
        <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
          <div className="animate-ping">
            <Heart className="h-24 w-24 text-red-500 fill-current" />
          </div>
          <div className="absolute animate-bounce text-white text-lg font-bold">
            +1 Bonus Coin!
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      <div className="md:hidden bg-black">
        {/* Video Player */}
        <div className="relative w-full aspect-video" ref={playerRef}>
          {/* Player loads here */}
        </div>
        
        {/* Progress Widget - Immediately After Video */}
        {currentJob && (
          <div className="bg-gray-900 text-white p-4 border-t border-gray-700">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="font-medium">Watch Progress</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-yellow-400 font-bold">+{Math.floor(watchSeconds)} coins</span>
                  <span className="text-white/80">{Math.floor(watchSeconds)}s / {Math.floor(actualDuration)}s</span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={progressPercentage} 
                  className="h-3 bg-gray-800"
                />
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full shadow-lg transition-all duration-200"
                  style={{ left: `${Math.min(progressPercentage, 98)}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400 flex items-center justify-center">
                  <Coins className="h-4 w-4 mr-1" />
                  {currentBalance.toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Balance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">
                  +{estimatedCoins}
                </div>
                <div className="text-xs text-white/60">Earning</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">
                  {queuedJobs.length}
                </div>
                <div className="text-xs text-white/60">Queued</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${isPlaying ? 'text-green-400' : 'text-red-400'}`}>
                  {isPlaying ? 'LIVE' : 'OFF'}
                </div>
                <div className="text-xs text-white/60">Status</div>
              </div>
            </div>

            {/* Video Info */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1 line-clamp-2">
                {videoData?.title || currentJob?.video?.title || "Loading..."}
              </h3>
              <div className="flex items-center text-sm text-white/80 mb-2">
                <User className="h-4 w-4 mr-1" />
                <span>{videoData?.channelTitle || currentJob?.video?.channel || 'Channel'}</span>
                <span className="mx-2">•</span>
                <Eye className="h-4 w-4 mr-1" />
                <span>{videoData?.viewCount ? videoData.viewCount.toLocaleString() : '0'} views</span>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2 flex-1">
                <Button
                  onClick={handleLike}
                  variant={videoLiked ? "default" : "outline"}
                  size="sm"
                  disabled={hasLiked}
                  className={`flex-1 ${
                    videoLiked 
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                      : 'border-gray-600 text-white hover:bg-red-600 hover:border-red-600 hover:text-white bg-transparent'
                  }`}
                  data-testid="button-like-video"
                >
                  <ThumbsUp className={`h-4 w-4 mr-1 text-white ${videoLiked ? 'fill-current' : ''}`} />
                  <span className="text-white">{videoLiked ? 'Liked' : 'Like'}</span>
                </Button>
                <Button
                  onClick={handleComment}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-600 text-white hover:bg-blue-600 hover:border-blue-600 hover:text-white bg-transparent"
                  data-testid="button-comment-video"
                >
                  <MessageCircle className="h-4 w-4 mr-1 text-white" />
                  <span className="text-white">Comment</span>
                </Button>
              </div>
              <div className="flex space-x-2 ml-2">
                <Button
                  onClick={toggleMute}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-transparent"
                  data-testid="button-mute-video"
                >
                  {isMuted ? 
                    <VolumeX className="h-4 w-4 text-white" /> : 
                    <Volume2 className="h-4 w-4 text-white" />
                  }
                </Button>
                <Button
                  onClick={() => {
                    const url = `https://youtube.com/watch?v=${currentJob?.video?.youtubeId}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "Link copied!", description: "YouTube link copied to clipboard" });
                  }}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-transparent"
                  data-testid="button-share-video"
                >
                  <Share2 className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Navigation */}
        <div className="bg-black border-t border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setLocation("/watch-queue")}
              variant="outline"
              size="sm"
              className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-transparent"
              data-testid="button-back-to-queue"
            >
              <ArrowLeft className="h-4 w-4 mr-2 text-white" />
              <span className="text-white">Queue</span>
            </Button>
            
            {queuedJobs.length > 0 && (
              <Button
                onClick={handleNextVideo}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-transparent"
                data-testid="button-next-video"
              >
                <span className="text-white">Next Video</span>
                <ChevronRight className="h-4 w-4 ml-2 text-white" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block relative">
        <div className="relative w-full h-screen flex">
          <div className="flex-1 relative" ref={playerRef}>
            {/* Player loads here */}
          </div>
        </div>
        
        {/* Desktop Navigation Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 via-black/80 to-transparent p-4 z-30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/watch-queue")}
                  className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-black/50"
                  data-testid="button-back-to-queue-desktop"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 text-white" />
                  <span className="text-white">Back to Queue</span>
                </Button>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevVideo}
                    className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-black/50"
                    disabled={queuedJobs.length === 0}
                    data-testid="button-prev-video-desktop"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1 text-white" />
                    <span className="text-white">Previous</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextVideo}
                    className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-black/50"
                    disabled={queuedJobs.length === 0}
                    data-testid="button-next-video-desktop"
                  >
                    <span className="text-white">Next</span>
                    <ChevronRight className="h-4 w-4 ml-1 text-white" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {queuedJobs.length > 0 && (
                  <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    <span className="text-white text-sm font-medium">
                      {queuedJobs.length} video{queuedJobs.length === 1 ? '' : 's'} queued
                    </span>
                  </div>
                )}
                
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
            
            {/* Video Info */}
            <div className="text-white">
              <h1 className="text-xl font-bold mb-2 line-clamp-2">
                {videoData?.title || currentJob?.video?.title || "Loading video..."}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-white/80">
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {videoData?.channelTitle || currentJob?.video?.channel || 'Loading...'}
                </span>
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {videoData?.viewCount ? videoData.viewCount.toLocaleString() : '0'} views
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Bottom Progress */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-6 z-30">
          <div className="max-w-7xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-white text-sm mb-2">
                <div className="flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="font-medium">Watch Progress</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-yellow-400 font-bold">+{Math.floor(watchSeconds)} coins earned</span>
                  <span className="text-white/80">{Math.floor(watchSeconds)}s / {Math.floor(actualDuration)}s</span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={progressPercentage} 
                  className="h-3 bg-gray-800"
                />
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full shadow-lg transition-all duration-200"
                  style={{ left: `${Math.min(progressPercentage, 98)}%` }}
                />
              </div>
            </div>

            {/* Stats and Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 flex items-center">
                    <Coins className="h-5 w-5 mr-1" />
                    {currentBalance.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/60">Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    +{estimatedCoins}
                  </div>
                  <div className="text-xs text-white/60">Earning</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${isPlaying ? 'text-green-400' : 'text-red-400'}`}>
                    {isPlaying ? 'LIVE' : 'OFF'}
                  </div>
                  <div className="text-xs text-white/60">Status</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleLike}
                  variant={videoLiked ? "default" : "outline"}
                  disabled={hasLiked}
                  className={`${
                    videoLiked 
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                      : 'border-gray-600 text-white hover:bg-red-600 hover:border-red-600 hover:text-white bg-black/50'
                  }`}
                  data-testid="button-like-video-desktop"
                >
                  <ThumbsUp className={`h-4 w-4 mr-2 text-white ${videoLiked ? 'fill-current' : ''}`} />
                  <span className="text-white">{videoLiked ? 'Liked' : 'Like'}</span>
                </Button>
                <Button
                  onClick={handleComment}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-blue-600 hover:border-blue-600 hover:text-white bg-black/50"
                  data-testid="button-comment-video-desktop"
                >
                  <MessageCircle className="h-4 w-4 mr-2 text-white" />
                  <span className="text-white">Comment</span>
                </Button>
                <Button
                  onClick={toggleMute}
                  variant="outline" 
                  className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-black/50"
                  data-testid="button-mute-video-desktop"
                >
                  {isMuted ? 
                    <VolumeX className="h-4 w-4 text-white" /> : 
                    <Volume2 className="h-4 w-4 text-white" />
                  }
                </Button>
                <Button
                  onClick={() => {
                    const url = `https://youtube.com/watch?v=${currentJob?.video?.youtubeId}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "Link copied!", description: "YouTube link copied to clipboard" });
                  }}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 bg-black/50"
                  data-testid="button-share-video-desktop"
                >
                  <Share2 className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}