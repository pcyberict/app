import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Clock, Video, TrendingUp, Upload, Play, ShoppingCart, ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";

// Helper functions for transaction display  
const getTransactionTitle = (transaction: any) => {
  switch (transaction.type) {
    case 'earn_watch':
      return 'Engaged boost campaign';
    case 'welcome_bonus':
      return 'Welcome bonus earned';
    case 'manual_adjustment':
      return transaction.reason || (transaction.amount > 0 ? 'Admin bonus added' : 'Account adjustment');
    case 'buy_coins':
      return 'Coins purchased';
    case 'spend_coins':
      return 'Video submission';
    case 'referral_bonus':
      return 'Referral bonus earned';
    default:
      return 'User Earned Article';
  }
};

const formatTransactionTime = (createdAt: string) => {
  const date = new Date(createdAt);
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: '2-digit'
  });
};


export default function Dashboard() {
  const { user } = useAuth();
  const { balance } = useBalance();
  
  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/account/transactions"],
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
    staleTime: 0, // Always fetch fresh data
  });

  const { data: watchHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/watch-history"],
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0, // Always fetch fresh data
  });

  const { data: userVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/videos", user?.id || ""],
    enabled: !!user?.id,
  });

  // Calculate stats with real-time balance
  const stats = {
    totalCoins: balance || 0,
    hoursWatched: Array.isArray(watchHistory) ? (watchHistory.reduce((sum: number, h: any) => sum + h.watchSeconds, 0) / 3600).toFixed(1) : "0",
    videosSubmitted: Array.isArray(userVideos) ? userVideos.length : 0,
    totalEarnings: Array.isArray(transactions) ? transactions.filter((t: any) => t.type === 'earn_watch').reduce((sum: number, t: any) => sum + t.amount, 0) : 0,
  };

  // Get recent activity (limit to 5 most recent)
  const recentActivity = Array.isArray(transactions) ? transactions.slice(0, 5).map((transaction: any) => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    createdAt: transaction.createdAt,
    details: transaction.details,
    reason: transaction.reason, // Include reason field for custom transaction reasons
  })) : [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your watch hours and earnings</p>
        </div>

        {/* Quick Actions with better mobile spacing */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
          <Link href="/submit-video">
            <Button className="w-full sm:w-auto bg-red-600 hover:bg-red-700 transition-colors duration-200">
              <Upload className="h-4 w-4 mr-2" />
              Submit Video
            </Button>
          </Link>
          <Link href="/watch-queue">
            <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 transition-colors duration-200">
              <Play className="h-4 w-4 mr-2" />
              Start Watching
            </Button>
          </Link>
          <Link href="/buy-coins">
            <Button variant="outline" className="w-full sm:w-auto border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/20">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy Coins
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Enhanced with animations and responsive design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium">Total Coins</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white animate-slideUp">
                  {stats.totalCoins.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 dark:bg-yellow-800/30 rounded-xl flex items-center justify-center">
                <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium">Hours Watched</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.hoursWatched}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-800/30 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium">Videos Submitted</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.videosSubmitted}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-800/30 rounded-xl flex items-center justify-center">
                <Video className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium">Total Earnings</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEarnings} coins</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-800/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Mobile-First Design */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
          <Link href="/account?tab=transactions">
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 dark:text-red-400 text-xs">
              View All
            </Button>
          </Link>
        </div>
        
        <div className="space-y-2">
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start watching videos to earn coins!</p>
            </div>
          ) : (
            recentActivity.map((activity: any) => {
              const isPositive = activity.amount > 0;
              const transactionTitle = getTransactionTitle(activity);
              const transactionTime = formatTransactionTime(activity.createdAt);
              const isManualAdjustment = activity.type === 'manual_adjustment';
              
              return (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:shadow-md dark:hover:bg-gray-800/80 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isPositive ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isPositive ? (
                        <ArrowDown className="h-4 w-4 text-white" />
                      ) : (
                        <ArrowUp className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-1">
                        {transactionTitle}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {transactionTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center">
                    <p className={`font-bold text-base flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}{Math.abs(activity.amount)}
                      <Coins className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}