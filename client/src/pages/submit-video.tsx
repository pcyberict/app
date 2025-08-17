import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, Upload, Rocket, ArrowUp, Flame } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";

const submitVideoSchema = z.object({
  youtubeUrl: z.string().url("Must be a valid YouTube URL").refine(
    (url) => url.includes("youtube.com/watch?v=") || url.includes("youtu.be/"),
    "Must be a valid YouTube video URL"
  ),
  requestedWatchSeconds: z.coerce.number().min(30).max(300),
  requestedWatches: z.coerce.number().min(10).max(1000),
  boostLevel: z.coerce.number().min(0).max(5),
});

type SubmitVideoForm = z.infer<typeof submitVideoSchema>;

export default function SubmitVideo() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, refreshBalance } = useBalance();
  const [videoPreview, setVideoPreview] = useState<any>(null);

  const form = useForm<SubmitVideoForm>({
    resolver: zodResolver(submitVideoSchema),
    defaultValues: {
      requestedWatchSeconds: 60,
      requestedWatches: 100,
      boostLevel: 0,
    },
  });

  const submitVideoMutation = useMutation({
    mutationFn: async (data: SubmitVideoForm) => {
      // Extract YouTube ID from URL
      const url = new URL(data.youtubeUrl);
      let youtubeId = "";
      
      if (url.hostname.includes("youtube.com")) {
        youtubeId = url.searchParams.get("v") || "";
      } else if (url.hostname.includes("youtu.be")) {
        youtubeId = url.pathname.slice(1);
      }

      if (!youtubeId) {
        throw new Error("Invalid YouTube URL");
      }

      const response = await apiRequest("POST", "/api/videos", {
        youtubeId,
        title: videoPreview?.title || "YouTube Video",
        thumbnailUrl: videoPreview?.thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        durationSeconds: videoPreview?.duration || 300,
        requestedWatchSeconds: data.requestedWatchSeconds,
        requestedWatches: data.requestedWatches,
        boostLevel: data.boostLevel,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your video has been submitted successfully!",
      });
      form.reset();
      setVideoPreview(null);
      // Refresh balance immediately
      refreshBalance();
      // Also trigger window event for other components
      window.dispatchEvent(new CustomEvent('balanceUpdate'));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  const baseCost = watchedValues.requestedWatchSeconds * watchedValues.requestedWatches;
  const boostCost = watchedValues.boostLevel * 50; // 50 coins per boost level
  const totalCost = baseCost + boostCost;

  const handleUrlChange = async (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      try {
        const response = await fetch('/api/youtube/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        
        if (response.ok) {
          const videoData = await response.json();
          setVideoPreview(videoData);
        } else {
          setVideoPreview(null);
          toast({
            title: "Error",
            description: "Could not fetch video information",
            variant: "destructive",
          });
        }
      } catch (error) {
        setVideoPreview(null);
        toast({
          title: "Error", 
          description: "Failed to extract video data",
          variant: "destructive",
        });
      }
    } else {
      setVideoPreview(null);
    }
  };

  const onSubmit = (data: SubmitVideoForm) => {
    const currentBalance = balance || 0;
    if (currentBalance < totalCost) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${totalCost} coins but only have ${currentBalance}.`,
        variant: "destructive",
      });
      return;
    }
    submitVideoMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submit Video</h1>
        <p className="text-gray-600 mt-1">Get your YouTube video watched by our community</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submit Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* YouTube URL Input */}
                <div>
                  <Label htmlFor="youtubeUrl">YouTube Video URL</Label>
                  <div className="relative mt-2">
                    <Input
                      id="youtubeUrl"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...form.register("youtubeUrl")}
                      onChange={(e) => {
                        form.setValue("youtubeUrl", e.target.value);
                        handleUrlChange(e.target.value);
                      }}
                      className="pr-12"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Link className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {form.formState.errors.youtubeUrl && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.youtubeUrl.message}</p>
                  )}
                </div>

                {/* Video Preview */}
                {videoPreview && (
                  <div className="bg-gray-50 rounded-xl p-4" data-testid="video-preview">
                    <div className="flex space-x-4">
                      <img 
                        src={videoPreview.thumbnailUrl}
                        alt="Video thumbnail" 
                        className="w-24 h-16 rounded-lg object-cover"
                        data-testid="img-video-thumbnail"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900" data-testid="text-video-title">{videoPreview.title}</h4>
                        <p className="text-sm text-gray-600" data-testid="text-video-duration">Duration: {Math.floor(videoPreview.duration / 60)}:{(videoPreview.duration % 60).toString().padStart(2, '0')}</p>
                        <p className="text-sm text-gray-600" data-testid="text-video-channel">Channel: {videoPreview.channelName}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Watch Requirements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="watchSeconds">Watch Duration (seconds)</Label>
                    <Select 
                      value={watchedValues.requestedWatchSeconds.toString()}
                      onValueChange={(value) => form.setValue("requestedWatchSeconds", parseInt(value))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                        <SelectItem value="90">90 seconds</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="watches">Number of Watches</Label>
                    <Input
                      id="watches"
                      type="number"
                      min="10"
                      max="1000"
                      className="mt-2"
                      {...form.register("requestedWatches")}
                    />
                  </div>
                </div>

                {/* Boost Options */}
                <div>
                  <Label className="text-base font-medium">Boost Options (Optional)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {[
                      { level: 0, name: "No Boost", description: "Standard priority", cost: "Free", icon: Rocket, color: "gray" },
                      { level: 1, name: "2x Boost", description: "Double exposure", cost: "+50 coins", icon: ArrowUp, color: "orange" },
                      { level: 2, name: "5x Boost", description: "Maximum exposure", cost: "+100 coins", icon: Flame, color: "red" },
                    ].map((boost) => (
                      <div
                        key={boost.level}
                        className={`border rounded-xl p-4 cursor-pointer transition-colors duration-200 ${
                          watchedValues.boostLevel === boost.level 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                        onClick={() => form.setValue("boostLevel", boost.level)}
                      >
                        <div className="text-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                            boost.color === 'gray' ? 'bg-gray-100' :
                            boost.color === 'orange' ? 'bg-orange-100' : 'bg-red-100'
                          }`}>
                            <boost.icon className={`h-5 w-5 ${
                              boost.color === 'gray' ? 'text-gray-600' :
                              boost.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                            }`} />
                          </div>
                          <h4 className="font-medium text-gray-900">{boost.name}</h4>
                          <p className="text-sm text-gray-600">{boost.description}</p>
                          <p className={`text-sm font-medium mt-1 ${
                            boost.level === 0 ? 'text-green-600' :
                            boost.color === 'orange' ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {boost.cost}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-700 py-4"
                  disabled={submitVideoMutation.isPending || !videoPreview}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Submit Video - {totalCost.toLocaleString()} coins</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Calculator */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Cost Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Watch Duration:</span>
                  <span className="font-medium">{watchedValues.requestedWatchSeconds} seconds</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Number of Watches:</span>
                  <span className="font-medium">{watchedValues.requestedWatches}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Base Cost:</span>
                  <span className="font-medium">{baseCost.toLocaleString()} coins</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Boost Cost:</span>
                  <span className="font-medium">{boostCost} coins</span>
                </div>
                
                <div className="flex justify-between py-3 text-lg font-semibold border-t border-gray-200">
                  <span className="text-gray-900">Total Cost:</span>
                  <span className="text-red-600">{totalCost.toLocaleString()} coins</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 1 coin = 1 second watched</li>
                  <li>• Your video gets real views</li>
                  <li>• Coins held in escrow</li>
                  <li>• Released as watches complete</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                <p className="text-sm text-yellow-800">
                  <strong>Your Balance:</strong> {balance?.toLocaleString() || 0} coins
                </p>
                {balance && balance < totalCost && (
                  <p className="text-sm text-red-600 mt-1">
                    Insufficient balance. Need {(totalCost - balance).toLocaleString()} more coins.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
