import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Eye, Coins, User, TrendingUp, Zap, Play, Flag, AlertTriangle, ChevronLeft, ChevronRight, Star, ThumbsUp, Crown } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

// Helper function to format view counts
const formatViews = (views: number) => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

export default function WatchQueue() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [reportingVideo, setReportingVideo] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");
  const [videoDataCache, setVideoDataCache] = useState<{[key: string]: any}>({});

  const { data: availableJobs, isLoading } = useQuery({
    queryKey: ["/api/watch/available"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch YouTube data for all videos
  const videoIds = useMemo(() => {
    return availableJobs && Array.isArray(availableJobs) ? 
      availableJobs.map((job: any) => job.video?.youtubeId).filter(Boolean) : [];
  }, [availableJobs]);

  // Query YouTube data for unique video IDs
  useEffect(() => {
    const fetchVideoData = async () => {
      if (videoIds.length === 0) return;
      
      for (const videoId of videoIds) {
        if (videoDataCache[videoId]) continue; // Skip if already cached
        
        try {
          const response = await fetch(`/api/youtube/video/${videoId}`);
          if (response.ok) {
            const data = await response.json();
            setVideoDataCache(prev => ({
              ...prev,
              [videoId]: data
            }));
          }
        } catch (error) {
          console.warn(`Failed to fetch data for video ${videoId}:`, error);
        }
      }
    };
    
    fetchVideoData();
  }, [videoIds, videoDataCache]);

  // AI Algorithm: Intelligent video ranking system
  const sortedJobs = (availableJobs && Array.isArray(availableJobs)) ? [...availableJobs].sort((a, b) => {
    const boostA = a.video?.boostLevel || 0;
    const boostB = b.video?.boostLevel || 0;
    
    // Primary sorting: Boost level (5x > 2x > 1x/standard)
    if (boostA !== boostB) return boostB - boostA;
    
    // Secondary sorting: Video engagement potential
    const viewsA = videoDataCache[a.video?.youtubeId]?.viewCount || 0;
    const viewsB = videoDataCache[b.video?.youtubeId]?.viewCount || 0;
    
    // Tertiary sorting: Coin reward value
    const rewardA = a.watchSecondsRequired || 0;
    const rewardB = b.watchSecondsRequired || 0;
    
    // AI scoring algorithm
    const scoreA = (boostA * 1000) + Math.log(viewsA + 1) * 10 + rewardA;
    const scoreB = (boostB * 1000) + Math.log(viewsB + 1) * 10 + rewardB;
    
    if (Math.abs(scoreA - scoreB) > 1) return scoreB - scoreA;
    
    // Final tie-breaker: Creation time (newer first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  const videosPerSlide = 4;
  const totalSlides = Math.ceil(sortedJobs.length / videosPerSlide);
  
  const getCurrentSlideVideos = () => {
    const start = currentSlide * videosPerSlide;
    return sortedJobs.slice(start, start + videosPerSlide);
  };

  const startWatchingMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", "/api/watch/assign", { jobId });
      return response.json();
    },
    onSuccess: (assignedJob) => {
      setLocation("/streaming");
      queryClient.invalidateQueries({ queryKey: ["/api/watch/available"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reportVideoMutation = useMutation({
    mutationFn: async ({ videoId, reason }: { videoId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/report`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video Reported",
        description: "Thank you for helping keep our platform safe. Your report has been submitted.",
      });
      setReportingVideo(null);
      setReportReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/watch/available"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    },
  });

  const handleStartWatching = () => {
    setLocation("/streaming");
  };

  const handleReportVideo = () => {
    if (!reportingVideo || !reportReason.trim()) return;
    reportVideoMutation.mutate({ 
      videoId: reportingVideo.video.id, 
      reason: reportReason.trim() 
    });
  };



  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
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
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Watch Queue Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Watch Queue</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Earn coins by watching videos • {sortedJobs.length} videos available
          </p>
          <div className="flex items-center space-x-6 mt-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4 text-orange-500" />
              <span>Boosted videos get priority</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Auto-queue after completion</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <Button 
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-2 shadow-lg"
            disabled={!sortedJobs || sortedJobs.length === 0}
            onClick={handleStartWatching}
            data-testid="button-start-streaming"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Streaming ({sortedJobs?.length || 0} videos)
          </Button>
        </div>
      </div>

      {/* Video Slider Section */}
      {!sortedJobs || sortedJobs.length === 0 ? (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-0">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No videos available</h3>
            <p className="text-gray-600 dark:text-gray-300">Check back later for new opportunities to earn coins!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Video Slider Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🎬 Available Videos to Watch
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Choose from {sortedJobs.length} amazing videos and start earning coins!
              </p>
            </div>
            
            {totalSlides > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="h-10 w-10 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500 px-2">
                  {currentSlide + 1} / {totalSlides}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextSlide}
                  disabled={currentSlide === totalSlides - 1}
                  className="h-10 w-10 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Professional Video Slider */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                    {getCurrentSlideVideos().map((job: any, index: number) => (
                      <Card 
                        key={job.id} 
                        className={`group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer ${
                          job.video?.boostLevel > 0 
                            ? 'ring-2 ring-orange-300 dark:ring-orange-700 shadow-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20' 
                            : 'hover:shadow-lg bg-white dark:bg-gray-800'
                        }`}
                        onClick={() => startWatchingMutation.mutate(job.id)}
                        data-testid={`video-card-${job.id}`}
                      >
                        <div className="relative">
                          <img 
                            src={job.video?.thumbnailUrl || `https://img.youtube.com/vi/${job.video?.youtubeId}/maxresdefault.jpg`}
                            alt={job.video?.title || "Video thumbnail"}
                            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${job.video?.youtubeId}/hqdefault.jpg`;
                            }}
                          />
                          
                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                <Play className="h-8 w-8 ml-1" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced Boost Badge with Crown for 5x */}
                          {job.video?.boostLevel > 0 && (
                            <div className="absolute top-3 right-3">
                              <div className={`text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center space-x-1 ${
                                job.video.boostLevel === 5 
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                                  : 'bg-gradient-to-r from-orange-500 to-red-500'
                              }`}>
                                {job.video.boostLevel === 5 && <Crown className="h-3 w-3" />}
                                <span>{job.video.boostLevel}X BOOST</span>
                              </div>
                            </div>
                          )}

                          {/* Queue Position */}
                          <div className="absolute top-3 left-3">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                              {(slideIndex * videosPerSlide) + index + 1}
                            </div>
                          </div>

                          {/* Video Duration */}
                          <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-medium">
                            {Math.floor((job.video?.durationSeconds || 0) / 60)}:{((job.video?.durationSeconds || 0) % 60).toString().padStart(2, '0')}
                          </div>
                          
                          {/* Earnings Preview */}
                          <div className="absolute bottom-3 left-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded text-sm font-bold shadow-lg">
                            +{job.watchSecondsRequired} 🪙
                          </div>
                        </div>
              
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Video Title */}
                            <div>
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-red-600 transition-colors">
                                {job.video?.title || "Video Title"}
                              </h3>
                              
                              {/* Channel Info */}
                              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  {videoDataCache[job.video?.youtubeId]?.channelTitle || 
                                   job.video?.channelTitle || 
                                   job.video?.channel || 
                                   'Loading channel...'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Stats Row */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-3">
                                {(videoDataCache[job.video?.youtubeId]?.viewCount || job.video?.viewCount) && (
                                  <span className="flex items-center text-gray-600 dark:text-gray-400">
                                    <Eye className="h-3 w-3 mr-1" />
                                    {formatViews(videoDataCache[job.video?.youtubeId]?.viewCount || job.video?.viewCount)}
                                  </span>
                                )}
                                <span className="flex items-center text-gray-600 dark:text-gray-400">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {job.watchSecondsRequired}s
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="font-bold text-yellow-600 dark:text-yellow-400">
                                  {job.watchSecondsRequired}
                                </span>
                              </div>
                            </div>
                            
                            {/* Quick Action Buttons */}
                            <div className="flex items-center justify-between pt-2">
                              <Button
                                size="sm"
                                className="flex-1 mr-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startWatchingMutation.mutate(job.id);
                                }}
                                disabled={startWatchingMutation.isPending}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Watch Now
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReportingVideo(job);
                                }}
                              >
                                <Flag className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {sortedJobs.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Videos Available</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {sortedJobs.reduce((sum, job) => sum + job.watchSecondsRequired, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Coins Available</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  {sortedJobs.filter(job => job.video?.boostLevel > 0).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Boosted Videos</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Video Report Dialog */}
      <Dialog open={!!reportingVideo} onOpenChange={(open) => !open && setReportingVideo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Report Video</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-1">Video Title:</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {reportingVideo?.video?.title || "Video Title"}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason for reporting <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this video (e.g., inappropriate content, spam, misleading information)..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Important:</p>
                  <p>False reports may result in account restrictions. Only report videos that violate our community guidelines.</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setReportingVideo(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReportVideo}
                disabled={!reportReason.trim() || reportVideoMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {reportVideoMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
