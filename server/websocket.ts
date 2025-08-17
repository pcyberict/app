import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';

interface UserData {
  id: string;
  email?: string;
  name?: string;
}

interface VideoCompletionData {
  userId: string;
  newBalance: number;
  coinsEarned: number;
}

interface VideoData {
  id: string;
  title: string;
  coinsReward: number;
  orderId: string;
}

export function setupWebSocket(server: Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5000",
      methods: ["GET", "POST"]
    }
  });

  // Store active connections
  const activeUsers = new Map<string, UserData>();
  
  // Real-time database update broadcast functions
  const broadcastDatabaseUpdate = (eventType: string, data: any, userId?: string) => {
    console.log(`Broadcasting ${eventType} update:`, data);
    if (userId) {
      io.to(`user_${userId}`).emit('database_update', { eventType, data, timestamp: new Date() });
    } else {
      io.emit('database_update', { eventType, data, timestamp: new Date() });
    }
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining with authentication
    socket.on('join', (userData: UserData) => {
      if (userData?.id) {
        activeUsers.set(socket.id, userData);
        socket.join(`user_${userData.id}`);
        
        // Broadcast user count update
        io.emit('user_count', activeUsers.size);
      }
    });

    // Handle watch queue updates
    socket.on('queue_updated', () => {
      // Broadcast to all users that queue has been updated
      socket.broadcast.emit('refresh_queue');
    });

    // Handle video completion
    socket.on('video_completed', (data: VideoCompletionData) => {
      // Broadcast queue refresh to all users
      io.emit('refresh_queue');
      
      // Update user's balance in real-time
      if (data.userId) {
        io.to(`user_${data.userId}`).emit('balance_updated', { 
          newBalance: data.newBalance,
          coinsEarned: data.coinsEarned 
        });
      }
    });

    // Handle new video submission
    socket.on('video_submitted', (videoData: VideoData) => {
      // Broadcast new video to all users immediately
      io.emit('new_video_available', videoData);
      io.emit('refresh_queue');
    });

    // Handle admin settings updates
    socket.on('admin_settings_updated', (data: { key: string; value: any }) => {
      console.log('Admin settings updated:', data);
      io.emit('admin_settings_change', data);
      broadcastDatabaseUpdate('admin_settings', data);
    });

    // Handle user profile updates
    socket.on('profile_updated', (data: { userId: string; profileData: any }) => {
      console.log('Profile updated:', data);
      broadcastDatabaseUpdate('user_profile', data, data.userId);
    });

    // Handle payment provider updates
    socket.on('payment_provider_updated', (data: any) => {
      console.log('Payment provider updated:', data);
      io.emit('payment_providers_change', data);
      broadcastDatabaseUpdate('payment_providers', data);
    });

    // Handle video status changes
    socket.on('video_status_changed', (data: { videoId: string; status: string; userId: string }) => {
      console.log('Video status changed:', data);
      io.emit('video_status_update', data);
      broadcastDatabaseUpdate('video_status', data, data.userId);
    });

    // Handle coin transactions
    socket.on('transaction_created', (data: { userId: string; amount: number; type: string; reason: string }) => {
      console.log('Transaction created:', data);
      broadcastDatabaseUpdate('transaction', data, data.userId);
      io.to(`user_${data.userId}`).emit('balance_updated', { 
        newBalance: data.amount,
        change: data.amount,
        reason: data.reason 
      });
    });

    // Handle notifications
    socket.on('notification_created', (data: { userId: string; title: string; message: string; type: string }) => {
      console.log('Notification created:', data);
      broadcastDatabaseUpdate('notification', data, data.userId);
      io.to(`user_${data.userId}`).emit('new_notification', data);
    });

    // Handle watch queue updates
    socket.on('watch_progress_updated', (data: { userId: string; videoId: string; progress: number }) => {
      console.log('Watch progress updated:', data);
      broadcastDatabaseUpdate('watch_progress', data, data.userId);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      activeUsers.delete(socket.id);
      io.emit('user_count', activeUsers.size);
    });
  });

  return io;
}

// Export for use in routes
export let socketIO: SocketIOServer;
export function setSocketIO(io: SocketIOServer) {
  socketIO = io;
}

// Helper function to broadcast database changes from routes
export function broadcastDatabaseChange(eventType: string, data: any, userId?: string) {
  if (!socketIO) return;
  
  console.log(`Broadcasting database change: ${eventType}`, data);
  
  if (userId) {
    socketIO.to(`user_${userId}`).emit('database_update', { 
      eventType, 
      data, 
      timestamp: new Date() 
    });
  } else {
    socketIO.emit('database_update', { 
      eventType, 
      data, 
      timestamp: new Date() 
    });
  }
}