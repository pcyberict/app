import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, MessageCircle } from "lucide-react";

export default function BanLockout() {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitAppealMutation = useMutation({
    mutationFn: async (appealMessage: string) => {
      const response = await apiRequest("POST", "/api/user/ban-appeal", { message: appealMessage });
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "✅ Appeal Submitted",
        description: "👍 Our support agents will contact you shortly.",
      });
      // Redirect to landing page after 3 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to submit appeal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (message.trim()) {
      submitAppealMutation.mutate(message);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-in zoom-in-95 duration-200">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-2">Request Sent Successfully!</h2>
            <p className="text-gray-600 mb-4">👍 Our support agents will contact you shortly.</p>
            <p className="text-sm text-gray-500">Redirecting to homepage...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 blur-sm"></div>
      <Card className="relative w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl border-red-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-red-600">🚫 Account Banned</CardTitle>
          <p className="text-gray-600 mt-2">You have been banned from using this platform.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium">Write to a moderator</h3>
            </div>
            <Textarea
              placeholder="Explain your situation or appeal the ban..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none"
              data-testid="textarea-ban-appeal"
            />
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={!message.trim() || submitAppealMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="button-submit-appeal"
          >
            {submitAppealMutation.isPending ? "Submitting..." : "Submit Appeal"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}