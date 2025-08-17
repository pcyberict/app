import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Download, Settings, LogOut, Plus, Minus, CreditCard, ArrowDown, ArrowUp, Play, Upload, Users, Gift, Edit, User } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import ProfileEditForm from "@/components/ProfileEditForm";
import AppearanceSettings from "@/components/AppearanceSettings";

export default function Account() {
  const { user } = useAuth();
  const { balance } = useBalance();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { data: transactions } = useQuery({
    queryKey: ["/api/account/transactions"],
  });

  const { data: watchHistory } = useQuery({
    queryKey: ["/api/account/watch-history"],
  });

  const stats = {
    totalEarned: transactions?.filter((t: any) => t.amount > 0).reduce((sum: number, t: any) => sum + t.amount, 0) || 0,
    totalSpent: Math.abs(transactions?.filter((t: any) => t.amount < 0).reduce((sum: number, t: any) => sum + t.amount, 0) || 0),
    videosWatched: watchHistory?.length || 0,
    videosSubmitted: transactions?.filter((t: any) => t.type === 'spend_coins').length || 0,
  };

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  const handleExportData = () => {
    const exportData = {
      user: {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        coinsBalance: user?.coinsBalance,
        createdAt: user?.createdAt,
      },
      transactions,
      watchHistory,
      stats,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `watchexchange-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
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

      <Tabs defaultValue="profile" className="w-full">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <img 
                  src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
                  alt="Profile picture" 
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-200 dark:ring-gray-600 mx-auto sm:mx-0"
                />
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">{user?.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
                  </p>
                  {user?.phoneNumber && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📞 {user.countryCode} {user.phoneNumber}
                    </p>
                  )}
                  {user?.country && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📍 {user.country}
                    </p>
                  )}
                </div>
              </div>

              {/* Account Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {balance?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Current Coins</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalEarned}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Earned</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalSpent}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Spent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.videosWatched}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Videos Watched</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">

          {/* Enhanced Transaction History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Transaction History</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                  transactions.map((transaction: any) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          transaction.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {transaction.amount > 0 ? (
                            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUp className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm sm:text-base ${
                            transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.amount > 0 ? 'Credit' : 'Debit'}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {transaction.reason || (
                              transaction.type === 'earn_watch' ? 'Earned from watching video' :
                              transaction.type === 'buy_coins' ? 'Coins purchased via payment' :
                              transaction.type === 'spend_coins' ? `Coins deducted for video submission${transaction.videoTitle ? ': "' + transaction.videoTitle + '"' : ''}` :
                              transaction.type === 'manual_adjustment' ? 'Manual adjustment by admin' :
                              transaction.type === 'welcome_bonus' ? 'Welcome bonus reward' :
                              transaction.type === 'referral_bonus' ? 'Referral bonus earned' :
                              'Unknown transaction'
                            )}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm sm:text-base ${
                          transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} coins
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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
                              transaction.amount > 0 ? 'Manual deposit added by admin' : 'Coins deducted by admin'
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} coins
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })} – {new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-6">
          {/* Coin Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle>Coin Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coins className="h-8 w-8 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{user?.coinsBalance?.toLocaleString() || 0}</p>
                <p className="text-gray-600 mb-4">Available Coins</p>
                <Link href="/buy-coins">
                  <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                    Buy More Coins
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Account Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Account Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Earned:</span>
                  <span className="font-medium text-green-600">{stats.totalEarned.toLocaleString()} coins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Spent:</span>
                  <span className="font-medium text-red-600">{stats.totalSpent.toLocaleString()} coins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Videos Watched:</span>
                  <span className="font-medium">{stats.videosWatched}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Videos Submitted:</span>
                  <span className="font-medium">{stats.videosSubmitted}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={handleExportData}
                  className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200" 
                  variant="outline"
                  data-testid="button-export-data"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span>Export Data</span>
                </Button>
                <Link href="/settings">
                  <Button className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200" variant="outline" data-testid="button-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    <span>Settings</span>
                  </Button>
                </Link>
                <Button 
                  onClick={handleSignOut}
                  className="w-full bg-red-100 text-red-700 hover:bg-red-200" 
                  variant="outline"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
