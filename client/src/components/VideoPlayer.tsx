import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Coins } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VideoPlayerProps {
  job: any;
  onClose: () => void;
}

export default function VideoPlayer({ job, onClose }: VideoPlayerProps) {
  const { toast } = useToast();
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const completeWatchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/watch/complete", {
        jobId: job.id,
        watchSeconds,
        sessionData: {
          sessionId: Date.now().toString(),
          userAgent: navigator.userAgent,
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Watch Completed!",
        description: `You earned ${data.coinsEarned} coins!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/transactions"] });
      setIsCompleted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Simulate watch progress
    intervalRef.current = setInterval(() => {
      setWatchSeconds((prev) => {
        const newSeconds = prev + 1;
        const progress = (newSeconds / job.watchSecondsRequired) * 100;
        setWatchProgress(Math.min(progress, 100));

        // Auto-complete when 80% watched
        if (progress >= 80 && !isCompleted && !completeWatchMutation.isPending) {
          completeWatchMutation.mutate();
        }

        return newSeconds;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [job.watchSecondsRequired, isCompleted, completeWatchMutation]);

  const handleClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <Card className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Watch Video</h2>
            <Button variant="ghost" onClick={handleClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Video Player Container */}
          <div className="bg-gray-900 rounded-xl mb-6 relative aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${job.video?.youtubeId}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Watch Progress */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Watch Progress</span>
              <span className="text-sm text-gray-600">{watchProgress.toFixed(0)}%</span>
            </div>
            <Progress value={watchProgress} className="mb-2" />
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Required: {job.watchSecondsRequired} seconds</span>
              <span>Watched: {watchSeconds} seconds</span>
            </div>
          </div>

          {/* Coin Reward Info */}
          <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Coins className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Earn {job.watchSecondsRequired} coins</p>
                <p className="text-sm text-gray-600">Watch at least 80% to earn reward</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium text-yellow-800">
                {isCompleted ? "Completed!" : 
                 completeWatchMutation.isPending ? "Processing..." : 
                 watchProgress >= 80 ? "Eligible for reward" : "Watching..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
