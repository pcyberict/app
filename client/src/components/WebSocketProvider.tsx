import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  userCount: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  userCount: 0,
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket server
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Join user room for personalized notifications
      socketInstance.emit('join', {
        id: user.id || user.sub,
        email: user.email,
        name: user.name
      });
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    // Real-time event handlers
    socketInstance.on('user_count', (count: number) => {
      setUserCount(count);
    });

    socketInstance.on('refresh_queue', () => {
      console.log('Queue refresh received - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
    });

    socketInstance.on('new_video_available', (videoData: { id: string; title: string; coinsReward: number }) => {
      console.log('New video available:', videoData);
      
      toast({
        title: "🎬 New Video Available!",
        description: `${videoData.title} - Earn ${videoData.coinsReward} coins`,
        duration: 5000,
      });
      
      // Refresh available jobs
      queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
    });

    socketInstance.on('balance_updated', (data: { newBalance: number; change?: number; reason?: string }) => {
      console.log('Balance updated:', data.newBalance, 'Change:', data.change, 'Reason:', data.reason);
      
      // Update balance in cache immediately
      queryClient.setQueryData(['/api/account/balance'], { balance: data.newBalance });
      
      // Show a toast notification for balance changes
      if (data.change !== undefined) {
        const changeText = data.change > 0 ? `+${data.change}` : `${data.change}`;
        toast({
          title: data.change > 0 ? "💰 Coins Added!" : "💸 Coins Deducted",
          description: `${changeText} coins - ${data.reason || 'Balance update'}`,
          duration: 3000,
        });
      }
      
      // Refresh all related queries for complete real-time sync
      queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watch-history'] });
      
      // Trigger custom balance update event for additional components
      window.dispatchEvent(new CustomEvent('balanceUpdate'));
    });

    socketInstance.on('video_submitted', (data: { orderId: string; title?: string }) => {
      console.log('Video submission confirmed:', data);
      
      toast({
        title: "✅ Video Submitted!",
        description: `Your video is now live! Order ID: ${data.orderId}`,
        duration: 6000,
      });
      
      // Refresh user's videos
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    });

    // Real-time database update handlers
    socketInstance.on('database_update', (updateData: { 
      eventType: string; 
      data: any; 
      timestamp: Date 
    }) => {
      console.log(`Database update received: ${updateData.eventType}`, updateData.data);
      
      // Handle different types of database updates
      switch (updateData.eventType) {
        case 'video_created':
          queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
          queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
          break;
          
        case 'transaction_created':
          queryClient.invalidateQueries({ queryKey: ['/api/account/balance'] });
          queryClient.invalidateQueries({ queryKey: ['/api/account/transactions'] });
          queryClient.invalidateQueries({ queryKey: ['/api/watch-history'] });
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
          // Trigger custom balance update event for additional components
          window.dispatchEvent(new CustomEvent('balanceUpdate'));
          break;
          
        case 'admin_settings_updated':
          queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
          toast({
            title: "⚙️ Settings Updated",
            description: `${updateData.data.key} has been updated`,
            duration: 3000,
          });
          break;
          
        case 'payment_providers':
          queryClient.invalidateQueries({ queryKey: ['/api/payment-providers'] });
          break;
          
        case 'user_profile':
          queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
          break;
          
        case 'watch_queue_updated':
          queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
          break;
          
        case 'notification':
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          toast({
            title: "🔔 New Notification",
            description: updateData.data.title || "You have a new notification",
            duration: 4000,
          });
          break;
          
        case 'video_status':
          queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
          queryClient.invalidateQueries({ queryKey: ['/api/watch/available'] });
          break;
          
        default:
          console.log(`Unhandled database update type: ${updateData.eventType}`);
      }
    });

    // Enhanced admin settings change handler
    socketInstance.on('admin_settings_change', (data: { key: string; value: any }) => {
      console.log('Admin settings changed:', data);
      
      // Special handling for YouTube API key updates
      if (data.key === 'youtube_api_key') {
        toast({
          title: "🎯 YouTube API Updated",
          description: "YouTube integration has been reconfigured",
          duration: 5000,
        });
      }
      
      // Refresh admin settings
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, toast]);

  const value = {
    socket,
    isConnected,
    userCount,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};