import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PayPalPaymentProps {
  selectedPackage: any;
}

export const PayPalPayment = ({ selectedPackage }: PayPalPaymentProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handleCreatePayPalPayment = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/payments/paypal/create", {
        packageId: selectedPackage.id,
      });
      const data = await response.json();
      setPaymentData(data);
      
      // In real implementation, redirect to PayPal
      toast({
        title: "PayPal Payment Created",
        description: "In a real implementation, you'd be redirected to PayPal.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create PayPal payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentData) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/payments/paypal/confirm", {
        paymentId: paymentData.paymentId,
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Payment Successful",
          description: `${data.coinsAdded} coins have been added to your account!`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-blue-500" />
          <span>PayPal Payment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!paymentData ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Pay securely with PayPal. You'll be redirected to complete your payment.
            </p>
            <Button 
              onClick={handleCreatePayPalPayment}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-paypal-payment"
            >
              {isLoading ? 'Creating Payment...' : `Pay $${selectedPackage?.price} with PayPal`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Payment Created</h4>
              <p className="text-sm text-blue-800">Amount: ${paymentData.amount}</p>
              <p className="text-sm text-blue-800">Coins: {paymentData.coins}</p>
              <p className="text-sm text-blue-600">Payment ID: {paymentData.paymentId}</p>
            </div>
            <p className="text-sm text-gray-600">
              Complete your payment in PayPal, then confirm below.
            </p>
            <Button 
              onClick={handleConfirmPayment}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-paypal-payment"
            >
              {isLoading ? 'Confirming...' : 'I\'ve Completed Payment'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};