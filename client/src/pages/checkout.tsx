import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Coins, Lock, CreditCard, Wallet, QrCode, DollarSign } from "lucide-react";
import { SiBinance } from "react-icons/si";
import { PayPalPayment } from "@/components/PayPalPayment";
import { CryptomusPayment } from "@/components/CryptomusPayment";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const CheckoutForm = ({ selectedPackage }: { selectedPackage: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase! Coins have been added to your account.",
      });
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />
          
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <Lock className="h-4 w-4" />
              <span>Your payment information is secure and encrypted</span>
            </div>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• SSL encrypted transactions</li>
              <li>• No payment data stored on our servers</li>
              <li>• Instant coin delivery upon confirmation</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            disabled={!stripe || isLoading}
            className="w-full bg-red-600 hover:bg-red-700 py-3"
          >
            {isLoading ? 'Processing...' : `Complete Purchase - $${selectedPackage?.price}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const BinancePayment = ({ selectedPackage }: { selectedPackage: any }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handleCreateBinancePayment = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/payments/binance/create", {
        packageId: selectedPackage.id,
      });
      const data = await response.json();
      setPaymentData(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create Binance payment. Please try again.",
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
      const response = await apiRequest("POST", "/api/payments/binance/confirm", {
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
          <SiBinance className="h-5 w-5 text-yellow-600" />
          <span>Binance Pay</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!paymentData ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Pay securely with Binance Pay. You'll be redirected to complete your payment.
            </p>
            <Button 
              onClick={handleCreateBinancePayment}
              disabled={isLoading}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              data-testid="button-create-binance-payment"
            >
              {isLoading ? 'Creating...' : `Pay $${selectedPackage?.price} with Binance`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <QrCode className="h-12 w-12 mx-auto mb-2 text-yellow-600" />
              <p className="font-medium">Payment Created</p>
              <p className="text-sm text-gray-600">Payment ID: {paymentData.paymentId}</p>
            </div>
            <p className="text-sm text-gray-600">
              Complete your payment in the Binance app, then confirm below.
            </p>
            <Button 
              onClick={handleConfirmPayment}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-binance-payment"
            >
              {isLoading ? 'Confirming...' : 'I\'ve Completed Payment'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get parameters from URL
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const packageId = urlParams.get('package') || 'growth';
    const method = urlParams.get('method') || 'stripe';
    setPaymentMethod(method);

    // Fetch package details
    fetch('/api/payments/packages')
      .then(res => res.json())
      .then(packages => {
        const pkg = packages.find((p: any) => p.id === packageId);
        setSelectedPackage(pkg);
      });

    // Only create Stripe PaymentIntent if using Stripe
    if (method === 'stripe') {
      if (!stripePromise) {
        setError("Stripe payment is currently unavailable. Please try another payment method.");
        return;
      }

      // Create PaymentIntent
      apiRequest("POST", "/api/create-payment-intent", { packageId })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error('Error creating payment intent:', error);
          setError("Failed to initialize payment. Please try again.");
        });
    }
  }, [location]);

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Error</h1>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!selectedPackage) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
          <p className="text-gray-600 mt-1">Preparing your checkout</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600 mt-1">Complete your coin purchase</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Package:</span>
                  <span className="font-medium">{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Coins:</span>
                  <span className="font-medium">{selectedPackage.coins.toLocaleString()} coins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">${selectedPackage.price}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-red-600">${selectedPackage.price}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-2">
          {paymentMethod === 'stripe' && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm selectedPackage={selectedPackage} />
            </Elements>
          )}
          
          {paymentMethod === 'binance' && (
            <BinancePayment selectedPackage={selectedPackage} />
          )}
          
          {paymentMethod === 'paypal' && (
            <PayPalPayment selectedPackage={selectedPackage} />
          )}
          
          {paymentMethod === 'cryptomus' && (
            <CryptomusPayment 
              packageData={selectedPackage} 
              onSuccess={(paymentData) => {
                toast({
                  title: "Payment Successful!",
                  description: `${selectedPackage.coins} coins have been added to your account`,
                });
              }}
              onError={(error) => {
                toast({
                  title: "Payment Failed",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
