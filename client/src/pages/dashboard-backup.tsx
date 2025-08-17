import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Clock, Video, DollarSign, Plus, Play, ShoppingCart, TrendingUp, Upload, ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";

export default function Dashboard() {
  const { user } = useAuth();
  const { balance } = useBalance();
  
  const { data: transactions } = useQuery({
    queryKey: ["/api/account/transactions"],
  });

  const { data: watchHistory } = useQuery({
    queryKey: ["/api/account/watch-history"],
  });

  const { data: userVideos } = useQuery({
    queryKey: ["/api/videos", user?.id],
    enabled: !!user?.id,
  });

  // Calculate stats with real-time balance
  const stats = {
    totalCoins: balance || 0,
    hoursWatched: watchHistory ? (watchHistory.reduce((sum: number, h: any) => sum + h.watchSeconds, 0) / 3600).toFixed(1) : 0,
    videosSubmitted: userVideos?.length || 0,
    totalEarnings: transactions ? transactions.filter((t: any) => t.type === 'earn_watch').reduce((sum: number, t: any) => sum + t.amount, 0) : 0,
  };

  const recentActivity = transactions?.slice(0, 3).map((transaction: any) => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    createdAt: transaction.createdAt,
    details: transaction.details,
  })) || [];

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

      {/* Recent Activity - Enhanced Mobile Design */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8">
        <Card className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">Recent Activity</CardTitle>
              <Link href="/account">
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 dark:text-red-400">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 sm:space-y-4">
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Coins className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start watching videos to earn coins!</p>
                </div>
              ) : (
                recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                        activity.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {activity.amount > 0 ? (
                          <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm sm:text-base ${
                          activity.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {activity.amount > 0 ? 'Credit' : 'Debit'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                          {activity.type === 'earn_watch' ? 'Earned from watching video' :
                           activity.type === 'spend_coins' ? 'Coins spent on video submission' :
                           activity.type === 'buy_coins' ? 'Coins purchased' :
                           'Transaction'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm sm:text-base ${
                        activity.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {activity.amount > 0 ? '+' : ''}{activity.amount} coins
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No activity yet</p>
                ) : (
                  recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'earn_watch' ? 'bg-green-100' : 
                        activity.type === 'buy_coins' ? 'bg-blue-100' : 'bg-red-100'
                      }`}>
                        {activity.type === 'earn_watch' ? (
                          <Plus className={`h-5 w-5 text-green-600`} />
                        ) : activity.type === 'buy_coins' ? (
                          <Coins className={`h-5 w-5 text-blue-600`} />
                        ) : (
                          <Upload className={`h-5 w-5 text-red-600`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {activity.type === 'earn_watch' ? `Earned ${activity.amount} coins` :
                           activity.type === 'buy_coins' ? `Purchased ${activity.amount} coins` :
                           `Spent ${Math.abs(activity.amount)} coins`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {activity.type === 'earn_watch' ? 'Video watch completed' :
                           activity.type === 'buy_coins' ? 'Payment processed' :
                           'Video submitted'}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/submit-video">
                  <Button className="w-full bg-red-600 hover:bg-red-700 flex items-center justify-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Submit New Video</span>
                  </Button>
                </Link>

                <Link href="/watch-queue">
                  <Button className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center space-x-2">
                    <Play className="h-4 w-4" />
                    <span>Watch Videos</span>
                  </Button>
                </Link>

                <Link href="/buy-coins">
                  <Button className="w-full bg-yellow-600 hover:bg-yellow-700 flex items-center justify-center space-x-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Buy Coins</span>
                  </Button>
                </Link>

                <Link href="/account">
                  <Button className="w-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>View Statistics</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
