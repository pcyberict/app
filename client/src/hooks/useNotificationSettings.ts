import { useState, useEffect } from "react";

interface NotificationSettings {
  soundEnabled: boolean;
  soundType: 'ping' | 'chime' | 'alert';
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem("notificationSettings");
    return saved ? JSON.parse(saved) : {
      soundEnabled: true,
      soundType: 'ping'
    };
  });

  useEffect(() => {
    localStorage.setItem("notificationSettings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const setSoundType = (soundType: NotificationSettings['soundType']) => {
    setSettings(prev => ({ ...prev, soundType }));
  };

  return {
    settings,
    updateSettings,
    toggleSound,
    setSoundType
  };
}