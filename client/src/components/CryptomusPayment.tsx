import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FaBitcoin } from "react-icons/fa";
import { Loader2, QrCode } from "lucide-react";

interface CryptomusPaymentProps {
  packageData: {
    id: string;
    name: string;
    coins: number;
    price: number;
  };
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
}

export function CryptomusPayment({ packageData, onSuccess, onError }: CryptomusPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const { toast } = useToast();

  const initiateCryptomusPayment = async () => {
    if (!customerEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/payments/cryptomus/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: packageData.id,
          customerEmail,
          amount: packageData.price,
          currency: 'USD',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Cryptomus payment');
      }

      const result = await response.json();
      setPaymentData(result);

      toast({
        title: "Payment Created",
        description: "Please complete your cryptocurrency payment using the details below",
      });
    } catch (error) {
      console.error('Cryptomus payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!paymentData?.paymentId) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/payments/cryptomus/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: paymentData.paymentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      const result = await response.json();
      
      if (result.status === 'completed') {
        onSuccess(result);
        toast({
          title: "Payment Successful!",
          description: `${packageData.coins} coins have been added to your account`,
        });
      } else {
        toast({
          title: "Payment Pending",
          description: "Your payment is being processed. Please wait...",
        });
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      onError(error instanceof Error ? error.message : 'Payment confirmation failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FaBitcoin className="h-6 w-6 text-orange-500" />
            <span>Cryptomus Payment</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">Amount: ${packageData.price}</p>
            <p className="text-sm text-gray-600">Payment ID: {paymentData.paymentId}</p>
          </div>

          {paymentData.walletAddress && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Wallet Address:</Label>
              <div className="p-3 bg-gray-100 rounded-lg break-all text-sm font-mono">
                {paymentData.walletAddress}
              </div>
            </div>
          )}

          {paymentData.amount && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount to Send:</Label>
              <div className="p-3 bg-gray-100 rounded-lg text-sm font-mono">
                {paymentData.amount} {paymentData.currency}
              </div>
            </div>
          )}

          {paymentData.qrCode && (
            <div className="text-center">
              <Label className="text-sm font-medium">QR Code:</Label>
              <div className="mt-2 flex justify-center">
                <img src={paymentData.qrCode} alt="Payment QR Code" className="max-w-48 max-h-48" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={confirmPayment}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Payment...
                </>
              ) : (
                'I Have Sent the Payment'
              )}
            </Button>
            
            <p className="text-xs text-center text-gray-500">
              Click the button above after sending the cryptocurrency to confirm your payment
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FaBitcoin className="h-6 w-6 text-orange-500" />
          <span>Pay with Cryptomus</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Order Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Package:</span>
              <span>{packageData.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Coins:</span>
              <span>{packageData.coins.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${packageData.price}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={initiateCryptomusPayment}
          disabled={isLoading || !customerEmail}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Payment...
            </>
          ) : (
            <>
              <QrCode className="mr-2 h-4 w-4" />
              Create Crypto Payment
            </>
          )}
        </Button>

        <div className="text-xs text-center text-gray-500">
          Secure cryptocurrency payment via Cryptomus
        </div>
      </CardContent>
    </Card>
  );
}