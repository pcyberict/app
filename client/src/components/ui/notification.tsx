import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Check, AlertTriangle } from "lucide-react";

interface NotificationProps {
  title: string;
  message: string;
  type?: "success" | "error" | "warning";
  onClose: () => void;
}

export function Notification({ title, message, type = "success", onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const iconColor = {
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-yellow-600",
  }[type];

  const bgColor = {
    success: "bg-green-100",
    error: "bg-red-100",
    warning: "bg-yellow-100",
  }[type];

  const Icon = {
    success: Check,
    error: X,
    warning: AlertTriangle,
  }[type];

  return (
    <div className="fixed top-20 right-4 max-w-sm z-50">
      <Card className="border border-gray-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{title}</p>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
