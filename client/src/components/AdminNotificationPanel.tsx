import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Send, Users, User } from "lucide-react";

export default function AdminNotificationPanel() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [notificationType, setNotificationType] = useState("general");

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
      targetType: string;
      targetUserId?: string;
    }) => {
      const endpoint = data.targetType === "all" 
        ? "/api/admin/notifications/broadcast"
        : `/api/admin/notifications/send`;
      
      await apiRequest("POST", endpoint, {
        title: data.title,
        message: data.message,
        type: data.type,
        soundType: data.type === 'deposit' ? 'chime' : 
                  data.type === 'adjustment' ? 'alert' : 'ping',
        ...(data.targetType === "specific" && { userId: data.targetUserId })
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification sent successfully",
      });
      // Reset form
      setTitle("");
      setMessage("");
      setTargetType("all");
      setTargetUserId("");
      setNotificationType("general");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (targetType === "specific" && !targetUserId) {
      toast({
        title: "Error",
        description: "Please select a user for specific notifications",
        variant: "destructive",
      });
      return;
    }

    sendNotificationMutation.mutate({
      title,
      message,
      type: notificationType,
      targetType,
      targetUserId: targetType === "specific" ? targetUserId : undefined,
    });
  };

  return (
    <Card className="w-full bg-red-50/90 dark:bg-red-950/20 backdrop-blur-sm border border-red-300/50 dark:border-red-700/50 shadow-xl">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl md:text-2xl text-red-700 dark:text-red-300">
          <Send className="h-5 w-5 sm:h-6 sm:w-6" />
          <span>Send Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="w-full">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notification Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              className="mt-1 w-full"
              required
            />
          </div>

          <div className="w-full">
            <Label htmlFor="message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Message *
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your notification message..."
              className="mt-1 w-full"
              rows={4}
              required
            />
          </div>

          <div className="w-full">
            <Label htmlFor="type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notification Type
            </Label>
            <Select value={notificationType} onValueChange={setNotificationType}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="video_live">Video Campaign Live</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <Label htmlFor="target" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Audience
            </Label>
            <Select value={targetType} onValueChange={(value: "all" | "specific") => setTargetType(value)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>All Users</span>
                  </div>
                </SelectItem>
                <SelectItem value="specific">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Specific User</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === "specific" && (
            <div className="w-full">
              <Label htmlFor="targetUser" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select User *
              </Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {(users as any[]).map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email?.split('@')[0] || 'User'
                          }
                        </span>
                        <span className="text-sm text-gray-500">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-4 sm:pt-6 w-full">
            <Button
              type="submit"
              disabled={sendNotificationMutation.isPending}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 sm:py-2 text-base sm:text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {sendNotificationMutation.isPending ? (
                "Sending..."
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Send Notification</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}