import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Video, 
  Flag, 
  DollarSign, 
  Bell, 
  Settings,
  BarChart3,
  Shield,
  Activity,
  TrendingUp
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import UserManagement from "@/components/UserManagement";
import AdminNotificationPanel from "@/components/AdminNotificationPanel";
import AdminSettings from "@/pages/AdminSettings";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const { data: videos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/videos"],
    retry: false,
  });

  const { data: flaggedVideos = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/flagged-videos"],
    retry: false,
  });

  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/reports"],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-800">
      <AdminHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Enhanced Navigation with Professional Mobile Design */}
          <div className="hidden md:block">
            <TabsList className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl p-1.5 grid grid-cols-6 gap-1.5 h-14">
              <TabsTrigger 
                value="overview" 
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-sm font-medium"
                data-testid="tab-overview"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden lg:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-sm font-medium"
                data-testid="tab-users"
              >
                <Users className="h-4 w-4" />
                <span className="hidden lg:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger 
                value="videos" 
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 dark:hover:from-purple-900/20 dark:hover:to-violet-900/20 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-sm font-medium"
                data-testid="tab-videos"
              >
                <Video className="h-4 w-4" />
                <span className="hidden lg:inline">Videos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 dark:hover:from-red-900/20 dark:hover:to-rose-900/20 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-sm font-medium"
                data-testid="tab-reports"
              >
                <Flag className="h-4 w-4" />
                <span className="hidden lg:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 dark:hover:from-yellow-900/20 dark:hover:to-amber-900/20 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-sm font-medium"
                data-testid="tab-notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden lg:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 dark:hover:from-gray-800/20 dark:hover:to-slate-800/20 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-700 data-[state=active]:text-white data-[state=active]:shadow-lg text-sm font-medium"
                data-testid="tab-settings"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Enhanced Responsive Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-300" data-testid="card-total-users">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">Total Users</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">
                        {stats?.totalUsers?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all duration-300" data-testid="card-active-videos">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                      <Video className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 truncate">Active Videos</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-white">
                        {stats?.activeVideos?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-lg transition-all duration-300" data-testid="card-total-revenue">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-yellow-700 dark:text-yellow-300 truncate">Total Revenue</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-900 dark:text-white">
                        ${stats?.totalRevenue?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20 border-red-200/50 dark:border-red-700/50 hover:shadow-lg transition-all duration-300" data-testid="card-pending-reports">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                      <Flag className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 truncate">Pending Reports</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900 dark:text-white">
                        {reports?.filter((r: any) => r.status === 'pending')?.length || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Recent Activity Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300" data-testid="card-recent-users">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="text-base sm:text-lg">Recent Users</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {stats?.recentUsers?.slice(0, 5).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={user.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"}
                            alt="User avatar"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email.split('@')[0]}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 capitalize">{user.role}</span>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-center">No recent users</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl transition-all duration-300" data-testid="card-platform-activity">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <span className="text-base sm:text-lg">Platform Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Videos Watched Today</span>
                      <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.watchesToday?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Coins Earned Today</span>
                      <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.coinsEarnedToday?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">New Submissions</span>
                      <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">{stats?.newSubmissions?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Active Users</span>
                      <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{stats?.activeUsers?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="videos" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl md:text-2xl">
                  <Video className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Video Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos?.slice(0, 6).map((video: any) => (
                    <div key={video.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <img 
                        src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                        alt="Video thumbnail" 
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">{video.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {Math.floor(video.durationSeconds / 60)}:{(video.durationSeconds % 60).toString().padStart(2, '0')} | 
                        {video.requestedWatches} watches | 
                        {video.requestedWatchSeconds}s each
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          video.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          video.status === 'flagged' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          video.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {video.status}
                        </span>
                        <span className="text-sm text-gray-500">{video.completedWatches}/{video.requestedWatches}</span>
                      </div>
                    </div>
                  )) || (
                    <p className="col-span-3 text-center text-gray-500">No videos found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl md:text-2xl">
                  <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Content Reports</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flaggedVideos && flaggedVideos.length > 0 ? (
                  <div className="space-y-4">
                    {flaggedVideos.map((video: any) => (
                      <div key={video.id} className="border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row lg:space-x-6">
                          <div className="flex-shrink-0 mb-4 lg:mb-0">
                            <img 
                              src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                              alt="Video thumbnail" 
                              className="w-full lg:w-48 h-32 object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">{video.title}</h4>
                              <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                                {video.reportCount} reports
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Order ID: {video.orderId} | Duration: {Math.floor(video.durationSeconds / 60)}:{(video.durationSeconds % 60).toString().padStart(2, '0')}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Flagged: {video.flaggedAt ? new Date(video.flaggedAt).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Flagged Content</h3>
                    <p className="text-gray-600 dark:text-gray-400">All videos are currently in good standing.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
            <div className="w-full">
              <AdminNotificationPanel />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}