import { useQuery } from "@tanstack/react-query";

interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
  thumbnail: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  subscriberCount: number;
  publishedAt: string;
}

export function useYouTubeData(videoId: string | undefined) {
  return useQuery<YouTubeVideoData>({
    queryKey: ['/api/youtube/video', videoId],
    queryFn: async (): Promise<YouTubeVideoData> => {
      if (!videoId) throw new Error('Video ID is required');
      
      console.log(`🎬 FETCHING YOUTUBE DATA for video: ${videoId}`);
      
      const response = await fetch(`/api/youtube/video/${videoId}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch YouTube data:', response.status, errorText);
        throw new Error(`Failed to fetch video data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ YOUTUBE DATA RECEIVED:', {
        title: data.title,
        channelTitle: data.channelTitle,
        viewCount: data.viewCount,
        likeCount: data.likeCount,
        duration: data.duration,
        publishedAt: data.publishedAt
      });
      return data;
    },
    enabled: !!videoId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2
  });
}