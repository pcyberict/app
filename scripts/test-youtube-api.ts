import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env' });
config({ path: '.env.defaults' });

async function testYouTubeAPI() {
  try {
    console.log('🧪 Testing YouTube API integration...');
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('❌ YouTube API key not found in environment');
      return;
    }
    
    console.log('✅ YouTube API key found');
    
    // Test direct YouTube API call
    const testVideoId = 'dQw4w9WgXcQ'; // Rick Roll
    console.log(`🎯 Testing with video ID: ${testVideoId}`);
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${testVideoId}&key=${apiKey}`
    );
    
    const data = await response.json() as any;
    
    if (!response.ok) {
      console.error('❌ YouTube API error:', data);
      return;
    }
    
    if (!data.items || data.items.length === 0) {
      console.error('❌ No video found');
      return;
    }
    
    const video = data.items[0];
    console.log('✅ Video found:', video.snippet.title);
    console.log('📊 Stats:', {
      views: video.statistics.viewCount,
      likes: video.statistics.likeCount,
      channel: video.snippet.channelTitle
    });
    
    // Test channel API
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${video.snippet.channelId}&key=${apiKey}`
    );
    
    const channelData = await channelResponse.json() as any;
    
    if (channelResponse.ok && channelData.items?.length > 0) {
      const channel = channelData.items[0];
      console.log('✅ Channel found:', channel.snippet.title);
      console.log('👥 Subscribers:', channel.statistics.subscriberCount);
    }
    
    console.log('🎉 YouTube API test completed successfully!');
    
  } catch (error) {
    console.error('❌ YouTube API test failed:', error);
  }
}

// Run the test
testYouTubeAPI();