import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AdminCoinAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
  adjustmentType: 'add' | 'remove';
}

const ADD_REASONS = [
  { value: "reward", label: "Reward" },
  { value: "manual_deposit", label: "Manual Deposit" },
  { value: "custom", label: "Custom Reason" }
];

const REMOVE_REASONS = [
  { value: "flagged_content", label: "Flagged Content" },
  { value: "report", label: "Report" },
  { value: "invalid_activities", label: "Invalid Activities" },
  { value: "custom", label: "Custom Reason" }
];

export default function AdminCoinAdjustmentDialog({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  adjustmentType
}: AdminCoinAdjustmentDialogProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const adjustCoinsMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/adjust-coins`, { amount, reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Coins ${adjustmentType === 'add' ? 'added' : 'removed'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAmount("");
    setReason("");
    setCustomReason("");
  };

  const handleSubmit = () => {
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Error", 
        description: "Please select a reason",
        variant: "destructive",
      });
      return;
    }

    let finalReason = reason;
    if (reason === "custom") {
      if (!customReason.trim()) {
        toast({
          title: "Error",
          description: "Please provide a custom reason",
          variant: "destructive",
        });
        return;
      }
      finalReason = customReason.trim();
    } else {
      const reasonOptions = adjustmentType === 'add' ? ADD_REASONS : REMOVE_REASONS;
      const reasonLabel = reasonOptions.find(r => r.value === reason)?.label || reason;
      finalReason = reasonLabel;
    }

    const finalAmount = adjustmentType === 'add' ? numAmount : -numAmount;
    adjustCoinsMutation.mutate({ amount: finalAmount, reason: finalReason });
  };

  const reasonOptions = adjustmentType === 'add' ? ADD_REASONS : REMOVE_REASONS;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-2 border-red-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-700">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-red-600" />
            </div>
            <span>
              {adjustmentType === 'add' ? 'Add Coins' : 'Remove Coins'}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">User</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md">
              <p className="font-medium text-gray-900">{userName}</p>
              <p className="text-sm text-gray-600">{userEmail}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter coin amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              min="1"
            />
          </div>

          <div>
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
              Reason
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "custom" && (
            <div>
              <Label htmlFor="customReason" className="text-sm font-medium text-gray-700">
                Custom Reason
              </Label>
              <Textarea
                id="customReason"
                placeholder="Enter custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={adjustCoinsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className={`flex-1 ${
                adjustmentType === 'add' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={adjustCoinsMutation.isPending}
            >
              {adjustCoinsMutation.isPending ? (
                adjustmentType === 'add' ? 'Adding...' : 'Removing...'
              ) : (
                adjustmentType === 'add' ? 'Add Coins' : 'Remove Coins'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}