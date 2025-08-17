import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Palette, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { settings, toggleSound, setSoundType } = useNotificationSettings();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <span>Appearance & Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Theme</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="flex items-center justify-center space-x-2 h-16 transition-all duration-200"
            >
              <Sun className="h-5 w-5" />
              <span>Light</span>
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="flex items-center justify-center space-x-2 h-16 transition-all duration-200"
            >
              <Moon className="h-5 w-5" />
              <span>Dark</span>
            </Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
          
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              {settings.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <Label htmlFor="sound-toggle" className="font-medium">
                  Notification Sounds
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Play sounds when you receive notifications
                </p>
              </div>
            </div>
            <Switch
              id="sound-toggle"
              checked={settings.soundEnabled}
              onCheckedChange={toggleSound}
            />
          </div>

          {/* Sound Type Selection */}
          {settings.soundEnabled && (
            <div className="space-y-2">
              <Label>Sound Type</Label>
              <Select
                value={settings.soundType}
                onValueChange={(value: any) => setSoundType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ping">🔔 Ping (Default)</SelectItem>
                  <SelectItem value="chime">🎵 Chime</SelectItem>
                  <SelectItem value="alert">⚠️ Alert</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Choose the sound that plays for notifications
              </p>
            </div>
          )}
        </div>

        {/* Save Preferences */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your preferences are automatically saved and synced across your devices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}