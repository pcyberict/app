import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Coins, User, Eye, ThumbsUp, MessageCircle, VolumeX, Volume2, Share2 } from "lucide-react";

interface StreamingLayoutProps {
  currentJob: any;
  videoData: any;
  watchSeconds: number;
  requiredSeconds: number;
  progressPercentage: number;
  currentBalance: number;
  estimatedCoins: number;
  queuedJobs: any[];
  isPlaying: boolean;
  videoLiked: boolean;
  hasLiked: boolean;
  isMuted: boolean;
  onLike: () => void;
  onComment: () => void;
  onToggleMute: () => void;
  onShare: () => void;
  playerRef: React.RefObject<HTMLDivElement>;
}

export default function StreamingLayout({
  currentJob,
  videoData,
  watchSeconds,
  requiredSeconds,
  progressPercentage,
  currentBalance,
  estimatedCoins,
  queuedJobs,
  isPlaying,
  videoLiked,
  hasLiked,
  isMuted,
  onLike,
  onComment,
  onToggleMute,
  onShare,
  playerRef
}: StreamingLayoutProps) {
  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden bg-black">
        {/* Video Player */}
        <div className="relative w-full aspect-video" ref={playerRef}>
          {/* Player loads here */}
        </div>
        
        {/* Progress Widget - Immediately After Video */}
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
                <span className="text-white/80">{Math.floor(watchSeconds)}s / {requiredSeconds}s</span>
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
              {currentJob?.video?.title}
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
                onClick={onLike}
                variant={videoLiked ? "default" : "outline"}
                size="sm"
                disabled={hasLiked}
                className="flex-1"
              >
                <ThumbsUp className={`h-4 w-4 mr-1 ${videoLiked ? 'fill-current' : ''}`} />
                {videoLiked ? 'Liked' : 'Like'}
              </Button>
              <Button
                onClick={onComment}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Comment
              </Button>
            </div>
            <div className="flex space-x-2 ml-2">
              <Button
                onClick={onToggleMute}
                variant="outline"
                size="sm"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                onClick={onShare}
                variant="outline"
                size="sm"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
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
        
        {/* Desktop Bottom Overlay with Progress */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-4 md:p-6 pb-6 md:pb-8 z-30">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Progress Bar Section */}
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
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full shadow-lg transition-all duration-200"
                  style={{ left: `${Math.min(progressPercentage, 98)}%` }}
                />
              </div>
            </div>

            {/* Desktop Stats and Controls */}
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
                    {isPlaying ? 'LIVE' : 'OFF'}
                  </div>
                  <div className="text-xs text-white/60">Status</div>
                </div>
              </div>

              {/* Desktop Action Buttons */}
              <div className="flex items-center space-x-3">
                <Button
                  onClick={onLike}
                  variant={videoLiked ? "default" : "outline"}
                  size="sm"
                  disabled={hasLiked}
                  className="text-white"
                >
                  <ThumbsUp className={`h-4 w-4 mr-2 ${videoLiked ? 'fill-current' : ''}`} />
                  {videoLiked ? 'Liked' : 'Like'}
                </Button>
                <Button
                  onClick={onComment}
                  variant="outline"
                  size="sm"
                  className="text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Comment
                </Button>
                <Button
                  onClick={onToggleMute}
                  variant="outline" 
                  size="sm"
                  className="text-white"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={onShare}
                  variant="outline"
                  size="sm"
                  className="text-white"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Video Info */}
            <div className="text-white">
              <h2 className="text-lg md:text-xl font-semibold mb-2 line-clamp-2">
                {currentJob?.video?.title}
              </h2>
              <div className="flex items-center text-sm text-white/80">
                <User className="h-4 w-4 mr-1" />
                <span className="mr-3">{videoData?.channelTitle || currentJob?.video?.channel || 'Channel'}</span>
                <Eye className="h-4 w-4 mr-1" />
                <span>{videoData?.viewCount ? videoData.viewCount.toLocaleString() : '0'} views</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}