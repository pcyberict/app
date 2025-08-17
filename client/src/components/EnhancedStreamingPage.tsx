import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from './WebSocketProvider';
import { apiRequest } from '@/lib/queryClient';
import { Play, Pause, SkipForward, ThumbsUp, MessageSquare, UserPlus, Crown } from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface WatchJob {
  id: string;
  videoId: string;
  watchSecondsRequired: number;
  video: {
    id: string;
    youtubeId: string;
    title: string;
    thumbnailUrl: string;
    duration: number;
    boostLevel?: number;
    channelId?: string;
  };
}

interface StreamingPageProps {
  className?: string;
}

export const EnhancedStreamingPage: React.FC<StreamingPageProps> = ({ className }) => {
  const [currentJob, setCurrentJob] = useState<WatchJob | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<Date | null>(null);
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  const [queue, setQueue] = useState<WatchJob[]>([]);
  const [comment, setComment] = useState('');
  const [engagementActions, setEngagementActions] = useState({
    liked: false,
    commented: false,
    subscribed: false
  });

  const playerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { socket, isConnected } = useWebSocket();

  // Fetch available watch jobs
  const { data: watchJobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['/api/watch/available'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Assign watch job mutation
  const assignJobMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest('/api/watch/assign', {
      method: 'POST',
      body: { jobId }
    }),
    onSuccess: (data) => {
      setCurrentJob(data);
      setIsWatching(true);
      setWatchStartTime(new Date());
      setWatchProgress(0);
      setEngagementActions({ liked: false, commented: false, subscribed: false });
      loadYouTubeVideo(data.video.youtubeId);
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Could not assign watch job",
        variant: "destructive",
      });
    }
  });

  // Complete watch job mutation
  const completeJobMutation = useMutation({
    mutationFn: (data: { jobId: string; watchSeconds: number; sessionData?: any }) => 
      apiRequest('/api/watch/complete', {
        method: 'POST',
        body: data
      }),
    onSuccess: (data) => {
      toast({
        title: "✅ Watch Completed!",
        description: `Earned ${data.coinsEarned} coins`,
        duration: 4000,
      });
      
      // Reset state and load next job
      setCurrentJob(null);
      setIsWatching(false);
      setWatchProgress(0);
      setWatchStartTime(null);
      setComment('');
      setEngagementActions({ liked: false, commented: false, subscribed: false });
      
      // Auto-load next job if available
      setTimeout(() => {
        refetchJobs();
        autoLoadNextJob();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Completion Failed",
        description: error.message || "Could not complete watch job",
        variant: "destructive",
      });
    }
  });

  // YouTube engagement mutations
  const likeMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest('/api/watch/like', {
      method: 'POST',
      body: { jobId }
    }),
    onSuccess: (data) => {
      setEngagementActions(prev => ({ ...prev, liked: true }));
      toast({
        title: `👍 Liked! +${data.bonusCoins} coins`,
        description: data.youtubeEngaged ? "Liked on YouTube too!" : "Platform reward earned",
        duration: 3000,
      });
    }
  });

  const commentMutation = useMutation({
    mutationFn: (data: { jobId: string; comment: string }) => 
      apiRequest('/api/watch/comment', {
        method: 'POST',
        body: data
      }),
    onSuccess: (data) => {
      setEngagementActions(prev => ({ ...prev, commented: true }));
      setComment('');
      toast({
        title: `💬 Commented! +${data.bonusCoins} coins`,
        description: data.youtubeEngaged ? "Comment posted on YouTube!" : "Platform reward earned",
        duration: 3000,
      });
    }
  });

  const subscribeMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest('/api/watch/subscribe', {
      method: 'POST',
      body: { jobId }
    }),
    onSuccess: (data) => {
      setEngagementActions(prev => ({ ...prev, subscribed: true }));
      toast({
        title: `🔔 Subscribed! +${data.bonusCoins} coins`,
        description: data.youtubeEngaged ? "Subscribed on YouTube!" : "Platform reward earned",
        duration: 3000,
      });
    }
  });

  // WebSocket integration for real-time queue updates
  useEffect(() => {
    if (socket) {
      socket.on('refresh_queue', () => {
        console.log('Refreshing queue from WebSocket');
        refetchJobs();
      });

      socket.on('new_video_available', (videoData: any) => {
        console.log('New video available via WebSocket:', videoData);
        refetchJobs();
      });
    }
  }, [socket, refetchJobs]);

  // Auto-load next job from queue
  const autoLoadNextJob = useCallback(() => {
    if (queue.length > 0 && !currentJob) {
      const nextJob = queue[0];
      assignJobMutation.mutate(nextJob.id);
    } else if (watchJobs.length > 0 && !currentJob) {
      const nextJob = watchJobs[0];
      assignJobMutation.mutate(nextJob.id);
    }
  }, [queue, currentJob, watchJobs, assignJobMutation]);

  // Update queue when watchJobs change
  useEffect(() => {
    setQueue(watchJobs.slice(0, 5)); // Keep next 5 jobs in queue
  }, [watchJobs]);

  // Initialize YouTube Player API
  useEffect(() => {
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API ready');
      };
    }
  }, []);

  const loadYouTubeVideo = (videoId: string) => {
    if (!window.YT || !window.YT.Player) {
      setTimeout(() => loadYouTubeVideo(videoId), 1000);
      return;
    }

    if (ytPlayer) {
      ytPlayer.loadVideoById(videoId);
      return;
    }

    const player = new window.YT.Player(playerRef.current, {
      height: '360',
      width: '640',
      videoId,
      playerVars: {
        autoplay: 1, // Auto-start video
        controls: 0, // Disable user controls
        disablekb: 1, // Disable keyboard controls
        fs: 0, // Disable fullscreen
        modestbranding: 1, // Minimal branding
        rel: 0, // No related videos
        showinfo: 0, // Hide video info
        iv_load_policy: 3, // Hide annotations
        cc_load_policy: 0, // Hide captions
        playsinline: 1,
        start: 0, // Start from beginning
        mute: 0, // Don't mute
      },
      events: {
        onReady: () => {
          console.log('YouTube player ready');
          setYtPlayer(player);
          startWatchProgress();
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            startWatchProgress();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            pauseWatchProgress();
          }
        },
      },
    });
  };

  const startWatchProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      if (currentJob && watchStartTime) {
        const elapsed = Math.floor((Date.now() - watchStartTime.getTime()) / 1000);
        const progress = Math.min(elapsed, currentJob.watchSecondsRequired);
        setWatchProgress(progress);

        // Auto-complete when required watch time is reached
        if (progress >= currentJob.watchSecondsRequired) {
          completeCurrentJob();
        }
      }
    }, 1000);
  };

  const pauseWatchProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const completeCurrentJob = () => {
    if (!currentJob || !watchStartTime) return;

    pauseWatchProgress();
    
    const watchSeconds = Math.floor((Date.now() - watchStartTime.getTime()) / 1000);
    const sessionData = {
      sessionId: `session_${Date.now()}`,
      device: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    completeJobMutation.mutate({
      jobId: currentJob.id,
      watchSeconds,
      sessionData
    });
  };

  const skipCurrentJob = () => {
    if (!currentJob) return;
    
    pauseWatchProgress();
    setCurrentJob(null);
    setIsWatching(false);
    setWatchProgress(0);
    setWatchStartTime(null);
    
    // Load next job
    setTimeout(autoLoadNextJob, 500);
  };

  // Engagement action handlers
  const handleLike = () => {
    if (!currentJob || engagementActions.liked) return;
    likeMutation.mutate(currentJob.id);
  };

  const handleComment = () => {
    if (!currentJob || !comment.trim() || engagementActions.commented) return;
    commentMutation.mutate({ jobId: currentJob.id, comment: comment.trim() });
  };

  const handleSubscribe = () => {
    if (!currentJob || engagementActions.subscribed) return;
    subscribeMutation.mutate(currentJob.id);
  };

  // Auto-load first job on mount
  useEffect(() => {
    if (!currentJob && watchJobs.length > 0) {
      autoLoadNextJob();
    }
  }, [currentJob, watchJobs, autoLoadNextJob]);

  return (
    <div className={`container mx-auto p-4 space-y-6 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Watch & Earn</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {currentJob ? (
        <div className="space-y-6">
          {/* Video Player */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">{currentJob.video.title}</h2>
              {currentJob.video.boostLevel && currentJob.video.boostLevel > 1 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Crown className="w-3 h-3 mr-1" />
                  {currentJob.video.boostLevel}x Boost
                </Badge>
              )}
            </div>
            
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
              <div ref={playerRef} className="w-full h-full" />
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Watch Progress</span>
                <span>{watchProgress}s / {currentJob.watchSecondsRequired}s</span>
              </div>
              <Progress 
                value={(watchProgress / currentJob.watchSecondsRequired) * 100} 
                className="h-2"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={completeCurrentJob} 
                disabled={watchProgress < currentJob.watchSecondsRequired}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete ({currentJob.watchSecondsRequired} coins)
              </Button>
              
              <Button 
                variant="outline" 
                onClick={skipCurrentJob}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            </div>
          </Card>

          {/* Engagement Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Earn Bonus Coins</h3>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={engagementActions.liked ? "default" : "outline"}
                  onClick={handleLike}
                  disabled={engagementActions.liked || likeMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {engagementActions.liked ? "Liked! (+15 coins)" : "Like (+15 coins)"}
                </Button>

                <Button
                  variant={engagementActions.subscribed ? "default" : "outline"}
                  onClick={handleSubscribe}
                  disabled={engagementActions.subscribed || subscribeMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {engagementActions.subscribed ? "Subscribed! (+50 coins)" : "Subscribe (+50 coins)"}
                </Button>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Write a comment to earn +25 bonus coins..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={engagementActions.commented}
                  maxLength={200}
                />
                <Button
                  variant={engagementActions.commented ? "default" : "outline"}
                  onClick={handleComment}
                  disabled={!comment.trim() || engagementActions.commented || commentMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {engagementActions.commented ? "Commented! (+25 coins)" : "Comment (+25 coins)"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Current Job</h2>
          <p className="text-muted-foreground mb-4">
            {watchJobs.length === 0 ? "No videos available to watch" : "Loading next video..."}
          </p>
          {watchJobs.length > 0 && (
            <Button onClick={autoLoadNextJob} disabled={assignJobMutation.isPending}>
              Start Watching
            </Button>
          )}
        </Card>
      )}

      {/* Queue Preview */}
      {queue.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Coming Up ({queue.length} videos)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.slice(0, 3).map((job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <img 
                  src={job.video.thumbnailUrl} 
                  alt={job.video.title}
                  className="w-16 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{job.video.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.watchSecondsRequired}s • {job.watchSecondsRequired} coins
                  </p>
                </div>
                {job.video.boostLevel && job.video.boostLevel > 1 && (
                  <Crown className="w-4 h-4 text-yellow-600" />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};