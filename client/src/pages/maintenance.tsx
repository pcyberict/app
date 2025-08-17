import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, RefreshCw, Clock, AlertCircle, Globe, Mail } from "lucide-react";

interface MaintenanceConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  siteName: string;
}

export default function MaintenancePage() {
  const [timeString, setTimeString] = useState("");

  const { data: config, refetch } = useQuery<MaintenanceConfig>({
    queryKey: ["/api/website-config/maintenance"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleString());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    refetch();
    window.location.reload();
  };

  const siteName = config?.siteName || "Y2Big";
  const maintenanceMessage = config?.maintenanceMessage || 
    "We're currently performing scheduled maintenance to improve your experience. We'll be back online soon!";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 dark:from-gray-900 dark:via-black dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Maintenance Card */}
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-orange-200/50 dark:border-orange-700/50 shadow-2xl">
          <CardContent className="p-8 md:p-12 text-center space-y-8">
            {/* Animated Wrench Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full w-24 h-24 mx-auto opacity-20 animate-ping"></div>
              <div className="relative bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full w-24 h-24 mx-auto flex items-center justify-center animate-pulse">
                <Wrench className="h-12 w-12 text-white animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            {/* Site Name */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent mb-2">
                {siteName}
              </h1>
              <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
                <Globe className="h-5 w-5" />
                <span className="font-medium">Under Maintenance</span>
              </div>
            </div>

            {/* Maintenance Message */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Scheduled Maintenance</span>
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                {maintenanceMessage}
              </p>
            </div>

            {/* Features During Maintenance */}
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <p className="font-medium text-orange-800 dark:text-orange-200">System Upgrades</p>
                <p className="text-orange-700 dark:text-orange-300">Improving performance</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <RefreshCw className="h-5 w-5 text-yellow-600" />
                </div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Database Updates</p>
                <p className="text-yellow-700 dark:text-yellow-300">Optimizing data</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
                <p className="font-medium text-green-800 dark:text-green-200">New Features</p>
                <p className="text-green-700 dark:text-green-300">Coming soon</p>
              </div>
            </div>

            {/* Current Time */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Current time: {timeString}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleRefresh}
                className="bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "mailto:support@" + window.location.hostname}
                className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/20"
                data-testid="button-contact"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>

            {/* Expected Duration */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-6">
              <p>
                <strong>Expected Duration:</strong> We expect to complete maintenance within the next few hours.
              </p>
              <p className="mt-1">
                Thank you for your patience while we make improvements to serve you better.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Indicator */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-sm text-orange-700 dark:text-orange-300">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span>Maintenance in progress</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; 2025 {siteName}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}