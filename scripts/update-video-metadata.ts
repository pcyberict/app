import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env' });
config({ path: '.env.defaults' });

async function updateVideoMetadata() {
  try {
    console.log('🔄 Starting video metadata update...');
    
    // Get all videos from the API
    const videosResponse = await fetch('http://localhost:5000/api/watch/available');
    if (!videosResponse.ok) {
      throw new Error('Failed to fetch videos');
    }
    
    const jobs = await videosResponse.json() as any[];
    console.log(`📹 Found ${jobs.length} videos to update`);
    
    for (const job of jobs) {
      const video = job.video;
      if (!video.youtubeId) {
        console.log(`⏭️  Skipping video ${video.id} - no YouTube ID`);
        continue;
      }
      
      console.log(`🎯 Updating metadata for: ${video.youtubeId}`);
      
      try {
        // Fetch YouTube metadata
        const metadataResponse = await fetch(`http://localhost:5000/api/youtube/metadata/${video.youtubeId}`);
        
        if (!metadataResponse.ok) {
          console.log(`❌ Failed to fetch metadata for ${video.youtubeId}: ${metadataResponse.status}`);
          continue;
        }
        
        const metadata = await metadataResponse.json() as any;
        
        console.log(`✅ Got metadata for "${metadata.title}" by ${metadata.channelTitle}`);
        console.log(`   📊 Views: ${metadata.viewCount.toLocaleString()}, Likes: ${metadata.likeCount.toLocaleString()}, Subscribers: ${metadata.subscriberCount.toLocaleString()}`);
        
        // Update video in database via API
        const updateResponse = await fetch(`http://localhost:5000/api/videos/${video.id}/metadata`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: metadata.title,
            channelTitle: metadata.channelTitle,
            channelThumbnail: metadata.channelThumbnail,
            channelId: metadata.channelId,
            viewCount: metadata.viewCount,
            likeCount: metadata.likeCount,
            subscriberCount: metadata.subscriberCount,
            thumbnailUrl: metadata.thumbnail,
            publishedAt: metadata.publishedAt
          })
        });
        
        if (updateResponse.ok) {
          console.log(`✅ Updated video metadata for ${video.youtubeId}`);
        } else {
          console.log(`❌ Failed to update video ${video.youtubeId}: ${updateResponse.status}`);
        }
        
        // Wait a bit to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing video ${video.youtubeId}:`, error);
      }
    }
    
    console.log('🎉 Video metadata update completed!');
    
  } catch (error) {
    console.error('❌ Failed to update video metadata:', error);
  }
}

// Run the update
updateVideoMetadata();