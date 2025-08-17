import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import NativeYouTubePlayer from "@/components/NativeYouTubePlayer";
import { ArrowLeft, Coins, Clock, Crown } from "lucide-react";

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle?: string;
  channelThumbnail?: string;
  viewCount?: number;
  likeCount?: number;
  subscriberCount?: number;
  publishedTimeText?: string;
  channelId?: string;
}

interface WatchJob {
  id: string;
  video: Video;
  watchSecondsRequired: number;
  status: string;
  coinsToEarn: number;
}

// Helper function to format published time
const formatPublishedTime = (publishedAt: string) => {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffInMs = now.getTime() - published.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInYears > 0) {
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  } else if (diffInMonths > 0) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  } else if (diffInWeeks > 0) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return 'Today';
  }
};

export default function StreamingNative() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Native YouTube experience state
  const [currentJob, setCurrentJob] = useState<WatchJob | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch current balance
  const { data: currentBalance } = useQuery({
    queryKey: ['/api/account/balance'],
    refetchInterval: 2000,
  });

  const balance = currentBalance?.balance || 0;

  // Fetch available watch jobs
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['/api/watch/available'],
    refetchInterval: 10000,
  });

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

  // Set current job
  useEffect(() => {
    if (jobs && jobs.length > 0 && !currentJob) {
      setCurrentJob(jobs[0]);
    }
  }, [jobs, currentJob]);

  // Reset state when job changes
  useEffect(() => {
    setWatchSeconds(0);
    setWatchProgress(0);
    setIsCompleted(false);
  }, [currentJob]);

  // Handle video completion
  const handleVideoEnd = async () => {
    if (!currentJob || isCompleted) return;

    setIsCompleted(true);
    const coinsEarned = currentJob.coinsToEarn || 60;

    try {
      await apiRequest(`/api/watch/complete`, {
        method: 'POST',
        body: { 
          jobId: currentJob.id,
          watchedSeconds: watchSeconds
        }
      });

      toast({
        title: "Video Completed! 🎉",
        description: `You earned ${coinsEarned} coins!`,
        duration: 3000,
      });

      // Refresh balance and get next video
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
      
      // Move to next video after delay
      setTimeout(() => {
        setCurrentJob(null);
      }, 2000);

    } catch (error) {
      console.error('Error completing video:', error);
      toast({
        title: "Error",
        description: "Failed to complete video. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle skip video
  const handleNextVideo = () => {
    setCurrentJob(null);
    queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading authentic YouTube experience...</p>
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
                {balance.toLocaleString()}
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
        {/* Native YouTube Player - 100% authentic experience */}
        <div className="relative">
          <NativeYouTubePlayer
            videoId={currentJob.video.youtubeId}
            onProgress={(seconds) => {
              setWatchSeconds(seconds);
              const progress = Math.min((seconds / requiredSeconds) * 100, 100);
              setWatchProgress(progress);
            }}
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
                      <span className="text-xs">Balance</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {balance.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Remaining</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {remainingSeconds}s
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
                      <Coins className="h-4 w-4" />
                      <span className="text-xs">Reward</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {currentJob.coinsToEarn || 60}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleNextVideo}
                    variant="outline" 
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Skip Video
                  </Button>
                  
                  {watchProgress >= 100 && (
                    <Button 
                      onClick={handleVideoEnd}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Claim Reward ({currentJob.coinsToEarn || 60} coins)
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}