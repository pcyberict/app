import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { videos } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env' });
config({ path: '.env.defaults' });

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client);

async function syncVideoData() {
  try {
    console.log('🔄 Starting video data synchronization...');
    
    // Get YouTube API key
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('❌ YouTube API key not found');
      return;
    }
    
    // Get all videos from database
    const allVideos = await db.select().from(videos);
    console.log(`📹 Found ${allVideos.length} videos in database`);
    
    for (const video of allVideos) {
      if (!video.youtubeId) {
        console.log(`⏭️  Skipping video ${video.id} - no YouTube ID`);
        continue;
      }
      
      console.log(`🎯 Syncing data for: ${video.youtubeId} (${video.title})`);
      
      try {
        // Fetch YouTube metadata
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${video.youtubeId}&key=${apiKey}`
        );
        
        const data = await response.json() as any;
        
        if (!response.ok || !data.items || data.items.length === 0) {
          console.log(`❌ Failed to fetch metadata for ${video.youtubeId}`);
          continue;
        }
        
        const ytVideo = data.items[0];
        const snippet = ytVideo.snippet;
        
        // Get channel information
        const channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${snippet.channelId}&key=${apiKey}`
        );
        
        const channelData = await channelResponse.json() as any;
        const channelInfo = channelData.items?.[0] || {};
        
        // Update video in database
        await db.update(videos)
          .set({
            title: snippet.title,
            channelTitle: snippet.channelTitle,
            channelThumbnail: channelInfo.snippet?.thumbnails?.default?.url || '',
            channelId: snippet.channelId,
            viewCount: parseInt(ytVideo.statistics?.viewCount || '0'),
            likeCount: parseInt(ytVideo.statistics?.likeCount || '0'),
            subscriberCount: parseInt(channelInfo.statistics?.subscriberCount || '0'),
            thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
            publishedAt: new Date(snippet.publishedAt),
            updatedAt: new Date()
          })
          .where(eq(videos.id, video.id));
        
        console.log(`✅ Updated ${video.youtubeId}: "${snippet.title}" by ${snippet.channelTitle}`);
        console.log(`   📊 Views: ${parseInt(ytVideo.statistics?.viewCount || '0').toLocaleString()}, Likes: ${parseInt(ytVideo.statistics?.likeCount || '0').toLocaleString()}, Subscribers: ${parseInt(channelInfo.statistics?.subscriberCount || '0').toLocaleString()}`);
        
        // Wait to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing video ${video.youtubeId}:`, error);
      }
    }
    
    console.log('🎉 Video data synchronization completed!');
    
  } catch (error) {
    console.error('❌ Failed to sync video data:', error);
  }
}

// Run the sync
syncVideoData().then(() => process.exit(0));