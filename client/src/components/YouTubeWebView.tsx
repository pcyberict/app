import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Coins, Heart, MessageCircle, Eye, Clock, User, Play, Pause } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface YouTubeWebViewProps {
  job: any;
  onClose: () => void;
  onComplete?: () => void;
}

export default function YouTubeWebView({ job, onClose, onComplete }: YouTubeWebViewProps) {
  const { toast } = useToast();
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const webViewRef = useRef<HTMLIFrameElement>(null);
  const visibilityRef = useRef<IntersectionObserver>();

  // Fetch authenticated YouTube session
  const { data: youtubeSession, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['/api/youtube/watch', job.video?.youtubeId],
    enabled: !!job.video?.youtubeId,
    retry: false
  });

  // Fetch video metadata
  const { data: videoData } = useQuery({
    queryKey: ['/api/youtube/video', job.video?.youtubeId],
    enabled: !!job.video?.youtubeId
  });

  // Complete watch mutation
  const completeWatchMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/watch/complete', {
        jobId: job.id,
        watchSeconds: watchSeconds
      });
    },
    onSuccess: () => {
      toast({
        title: "Watch Completed!",
        description: `You earned ${job.watchSecondsRequired} coins!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
      setIsCompleted(true);
      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete watch",
        variant: "destructive",
      });
    }
  });

  // Initialize intersection observer for visibility tracking
  useEffect(() => {
    if (webViewRef.current) {
      visibilityRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsVideoVisible(entry.isIntersecting && entry.intersectionRatio > 0.5);
        },
        { threshold: 0.5 }
      );

      visibilityRef.current.observe(webViewRef.current);
    }

    return () => {
      if (visibilityRef.current) {
        visibilityRef.current.disconnect();
      }
    };
  }, []);

  // Start countdown when session is ready
  useEffect(() => {
    if (youtubeSession && !sessionLoading && !sessionError) {
      setSessionData(youtubeSession);
      startCountdown();
    }
  }, [youtubeSession, sessionLoading, sessionError]);

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

    console.log("Starting watch timer for video:", job.video?.youtubeId);
    intervalRef.current = setInterval(() => {
      if (isVideoVisible && !showCountdown) {
        setWatchSeconds(prev => {
          const newSeconds = prev + 1;
          const requiredSeconds = job.watchSecondsRequired || 60;
          
          const progress = Math.min((newSeconds / requiredSeconds) * 100, 100);
          setWatchProgress(progress);
          
          const earned = Math.floor((newSeconds / requiredSeconds) * job.watchSecondsRequired);
          setCoinsEarned(earned);

          console.log(`Watch progress: ${newSeconds}/${requiredSeconds}s (${progress.toFixed(1)}%)`);

          if (newSeconds >= requiredSeconds && !isCompleted) {
            console.log("Video watch requirement completed!");
            completeWatchMutation.mutate();
            return newSeconds;
          }

          return newSeconds;
        });
      }
    }, 1000);
  }, [isVideoVisible, showCountdown, job.watchSecondsRequired, isCompleted, completeWatchMutation]);

  const stopWatchTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopWatchTimer();
    };
  }, [stopWatchTimer]);

  const handleClose = () => {
    stopWatchTimer();
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

  // Handle authentication errors
  if (sessionError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <Card className="bg-white dark:bg-gray-900 shadow-2xl max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="mb-4">Please sign in with Google to watch videos.</p>
            <div className="flex space-x-3">
              <Button onClick={() => window.location.href = '/api/auth/google'}>
                Sign In with Google
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <Card className="bg-white dark:bg-gray-900 shadow-2xl max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading YouTube session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                        {(videoData as any).channelTitle || 'Unknown Channel'}
                      </span>
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {formatViews((videoData as any).viewCount || 0)} views
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {(videoData as any).publishedAt ? formatTimeAgo((videoData as any).publishedAt) : 'Unknown date'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button variant="ghost" onClick={handleClose} className="shrink-0">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* YouTube WebView Container */}
            <div className="bg-black rounded-xl mb-6 relative aspect-video overflow-hidden">
              {sessionData && (
                <iframe
                  ref={webViewRef}
                  src={sessionData.youtubeUrl}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              )}
              
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

            {/* Progress and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coins className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Progress</span>
                  </div>
                  <Progress value={watchProgress} className="mb-2" />
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {formatDuration(watchSeconds)} / {formatDuration(job.watchSecondsRequired || 60)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coins className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Coins Earned</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {coinsEarned}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    / {job.watchSecondsRequired || 60} total
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Status</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {isCompleted ? (
                      <span className="text-green-600 dark:text-green-400">Completed!</span>
                    ) : showCountdown ? (
                      <span className="text-yellow-600 dark:text-yellow-400">Starting...</span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400">Watching</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Heart className="h-4 w-4" />
                  <span>Like</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Comment</span>
                </Button>
              </div>
              
              <div className="flex items-center space-x-3">
                {isCompleted && (
                  <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                    Continue to Next Video
                  </Button>
                )}
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}