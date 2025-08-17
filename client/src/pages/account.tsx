import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Download, LogOut, ArrowDown, ArrowUp, Edit, User, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import ProfileEditForm from "@/components/ProfileEditForm";
import AppearanceSettings from "@/components/AppearanceSettings";

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

export default function Account() {
  const { user } = useAuth();
  const { balance } = useBalance();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [location] = useLocation();
  
  // Get tab from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || 'profile');

  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  const { data: transactions } = useQuery({
    queryKey: ["/api/account/transactions"],
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
    staleTime: 0, // Always fetch fresh data
  });

  const { data: watchHistory } = useQuery({
    queryKey: ["/api/watch-history"],
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0, // Always fetch fresh data
  });

  // Calculate stats with real-time balance
  const stats = {
    totalEarned: transactions ? transactions.filter((t: any) => t.amount > 0).reduce((sum: number, t: any) => sum + t.amount, 0) : 0,
    totalSpent: transactions ? Math.abs(transactions.filter((t: any) => t.amount < 0).reduce((sum: number, t: any) => sum + t.amount, 0)) : 0,
    videosWatched: watchHistory?.length || 0,
    currentBalance: balance || 0, // Real-time balance from useBalance hook
  };

  const [, setLocation] = useLocation();

  const handleSignOut = () => {
    // Clear any local storage or session data
    localStorage.clear();
    sessionStorage.clear();
    
    // Navigate to logout endpoint which will redirect to landing page
    window.location.href = '/api/auth/logout';
  };

  const handleExportData = () => {
    const userData = {
      profile: user,
      transactions: transactions,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `watch-exchange-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isEditingProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setIsEditingProfile(false)}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
          >
            ← Back to Account
          </Button>
        </div>
        <ProfileEditForm
          user={user}
          onCancel={() => setIsEditingProfile(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Account</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your profile and view your activity</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-y-0 sm:space-x-6">
                <div className="flex-shrink-0">
                  <img 
                    src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
                    alt="Profile picture" 
                    className="w-24 h-24 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-gray-200 dark:ring-gray-600"
                  />
                </div>
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h3 className="text-xl sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 break-words">{user?.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-1 sm:space-y-0 mt-2">
                    {user?.phoneNumber && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center sm:justify-start">
                        📞 {user.countryCode} {user.phoneNumber}
                      </p>
                    )}
                    {user?.country && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center sm:justify-start">
                        📍 {user.country}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* YouTube Integration Status */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                {user?.googleAccessToken ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">▶</span>
                      </div>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">YouTube Connected</p>
                        <p className="text-sm text-green-600 dark:text-green-300">Your likes and subscriptions sync to YouTube</p>
                      </div>
                    </div>
                    <div className="text-green-600 dark:text-green-300">✓</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">▶</span>
                      </div>
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">Connect YouTube Account</p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-300">Enable real YouTube interactions and sync</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.location.href = '/auth/google'}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Connect
                    </Button>
                  </div>
                )}
              </div>

              {/* Account Stats - Real-time Updates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 animate-slideUp">
                    {stats.currentBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Current Coins</p>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalEarned}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Earned</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalSpent}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Spent</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.videosWatched}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Videos Watched</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* Recent Transactions - Mobile-First Design */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Transactions</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="flex items-center space-x-1 text-xs px-2 py-1"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
            
            <div className="space-y-2">
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Coins className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Start watching videos or buy coins to see your transaction history
                  </p>
                </div>
              ) : (
                transactions.map((transaction: any) => {
                  const isPositive = transaction.amount > 0;
                  const transactionTitle = getTransactionTitle(transaction);
                  const transactionTime = formatTransactionTime(transaction.createdAt);
                  
                  return (
                    <div 
                      key={transaction.id} 
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
                          {isPositive ? '+' : ''}{Math.abs(transaction.amount)}
                          <Coins className="h-4 w-4 ml-1" />
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>

      {/* Quick Actions for Mobile */}
      <div className="flex flex-col sm:flex-row gap-3 sm:hidden">
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="flex items-center justify-center space-x-2 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}