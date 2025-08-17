import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Settings as SettingsIcon, Bell, Eye, Globe, Save } from "lucide-react";

const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  autoPlay: z.boolean(),
  defaultWatchTime: z.coerce.number().min(30).max(300),
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["en", "es", "fr", "de"]),
  privacyMode: z.boolean(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: false,
      autoPlay: true,
      defaultWatchTime: 60,
      theme: "system",
      language: "en",
      privacyMode: false,
    },
  });

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('watchexchange-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        form.reset(settings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, [form]);

  const onSubmit = async (data: SettingsForm) => {
    setIsLoading(true);
    try {
      // Save settings to localStorage
      localStorage.setItem('watchexchange-settings', JSON.stringify(data));
      
      // Apply theme immediately
      const root = document.documentElement;
      if (data.theme === 'dark') {
        root.classList.add('dark');
      } else if (data.theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System theme
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account preferences and notifications</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive updates about your watch progress and earnings
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={form.watch("emailNotifications")}
                onCheckedChange={(checked) => form.setValue("emailNotifications", checked)}
                data-testid="switch-email-notifications"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pushNotifications">Push Notifications</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get instant alerts for new video opportunities
                </p>
              </div>
              <Switch
                id="pushNotifications"
                checked={form.watch("pushNotifications")}
                onCheckedChange={(checked) => form.setValue("pushNotifications", checked)}
                data-testid="switch-push-notifications"
              />
            </div>
          </CardContent>
        </Card>

        {/* Video Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Video Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoPlay">Auto-play Videos</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically start playing videos when assigned
                </p>
              </div>
              <Switch
                id="autoPlay"
                checked={form.watch("autoPlay")}
                onCheckedChange={(checked) => form.setValue("autoPlay", checked)}
                data-testid="switch-autoplay"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultWatchTime">Default Watch Time (seconds)</Label>
              <Input
                id="defaultWatchTime"
                type="number"
                min="30"
                max="300"
                {...form.register("defaultWatchTime")}
                className="w-full"
                data-testid="input-default-watch-time"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Default duration for new video submissions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Appearance & Language</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={form.watch("theme")}
                onValueChange={(value: "light" | "dark" | "system") => form.setValue("theme", value)}
              >
                <SelectTrigger data-testid="select-theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={form.watch("language")}
                onValueChange={(value: "en" | "es" | "fr" | "de") => form.setValue("language", value)}
              >
                <SelectTrigger data-testid="select-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Privacy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="privacyMode">Privacy Mode</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Hide your activity from other users
                </p>
              </div>
              <Switch
                id="privacyMode"
                checked={form.watch("privacyMode")}
                onCheckedChange={(checked) => form.setValue("privacyMode", checked)}
                data-testid="switch-privacy-mode"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-red-600 hover:bg-red-700"
            disabled={isLoading}
            data-testid="button-save-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}