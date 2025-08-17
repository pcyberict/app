import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import FixedVideoPlayer from "@/components/FixedVideoPlayer";

export default function StreamingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Simplified state for new video player
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

  // Assign watching job
  const assignWatchMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", "/api/watch/assign", { jobId });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log("Job assigned successfully:", data);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading videos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No videos available
  if (!availableJobs || availableJobs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold mb-4">No Videos Available</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              There are no videos available to watch right now. Check back later!
            </p>
            <Button
              onClick={() => setLocation('/dashboard')}
              variant="outline"
              className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main video player view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
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
    </div>
  );
}