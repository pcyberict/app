import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coins, CreditCard, AlertTriangle, Wallet } from "lucide-react";
import { SiBinance } from "react-icons/si";
import { FaBitcoin } from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export default function BuyCoins() {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState("growth");
  const [paymentMethod, setPaymentMethod] = useState("");

  const { data: packages } = useQuery({
    queryKey: ["/api/payments/packages"],
  });

  const selectedPkg = Array.isArray(packages) ? packages.find((pkg: any) => pkg.id === selectedPackage) : null;
  
  // Query enabled payment providers from backend
  const { data: enabledProviders = [] } = useQuery({
    queryKey: ['/api/payment-providers/enabled'],
    retry: false,
  });

  // Set default payment method when providers load
  useEffect(() => {
    const enabledOnly = Array.isArray(enabledProviders) ? enabledProviders.filter((p: any) => p.isEnabled) : [];
    if (enabledOnly.length > 0 && !paymentMethod) {
      setPaymentMethod(enabledOnly[0].provider);
    }
  }, [enabledProviders, paymentMethod]);

  const enabledOnly = Array.isArray(enabledProviders) ? enabledProviders.filter((p: any) => p.isEnabled) : [];
  const isAnyPaymentEnabled = enabledOnly.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Buy Coins</h1>
        <p className="text-gray-600 mt-1">Purchase coins to submit your videos</p>
      </div>

      {!isAnyPaymentEnabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Payment system is currently unavailable. Please contact support to purchase coins.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coin Packages */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose a Package</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.isArray(packages) && packages.map((pkg: any) => (
              <div
                key={pkg.id}
                className={`border rounded-2xl p-6 cursor-pointer transition-all duration-200 relative ${
                  selectedPackage === pkg.id 
                    ? 'border-red-500 bg-red-50 shadow-md' 
                    : 'border-gray-200 hover:border-red-300 bg-white'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {pkg.id === 'growth' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      POPULAR
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Coins className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                  <p className="text-3xl font-bold text-red-600 mb-2">{pkg.coins.toLocaleString()} coins</p>
                  <p className="text-lg font-semibold text-gray-900 mb-4">${pkg.price}</p>
                  <p className="text-sm text-gray-600 mb-6">
                    {pkg.id === 'starter' && 'Perfect for trying out the platform'}
                    {pkg.id === 'growth' && 'Best value for regular users'}
                    {pkg.id === 'pro' && 'For content creators'}
                    {pkg.id === 'business' && 'Maximum value package'}
                  </p>
                  <Button 
                    className={`w-full ${
                      selectedPackage === pkg.id 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {selectedPackage === pkg.id ? 'Selected' : 'Select Package'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods & Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  {Array.isArray(enabledProviders) && enabledProviders.filter((p: any) => p.isEnabled).map((provider: any) => (
                    <div key={provider.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:border-red-300">
                      <RadioGroupItem value={provider.provider} id={provider.provider} />
                      <Label htmlFor={provider.provider} className="flex items-center space-x-3 cursor-pointer">
                        {provider.provider === 'stripe' && <CreditCard className="h-6 w-6 text-blue-600" />}
                        {provider.provider === 'binance_pay' && <SiBinance className="h-6 w-6 text-yellow-600" />}
                        {provider.provider === 'paypal' && <Wallet className="h-6 w-6 text-blue-500" />}
                        {provider.provider === 'cryptomus' && <FaBitcoin className="h-6 w-6 text-orange-500" />}
                        <span className="font-medium text-gray-900">{provider.displayName}</span>
                      </Label>
                    </div>
                  ))}
                  
                  {(!Array.isArray(enabledProviders) || enabledProviders.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No payment methods are currently available.
                    </div>
                  )}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Package:</span>
                  <span className="font-medium">{selectedPkg?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Coins:</span>
                  <span className="font-medium">{selectedPkg?.coins.toLocaleString()} coins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">${selectedPkg?.price}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-red-600">${selectedPkg?.price}</span>
                </div>
              </div>
              
              <Link href={`/checkout?package=${selectedPackage}&method=${paymentMethod}`}>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 mt-6"
                  disabled={!isAnyPaymentEnabled}
                  data-testid="button-complete-purchase"
                >
                  {!isAnyPaymentEnabled ? 'Payment Unavailable' : 'Complete Purchase'}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">Secure Payment</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• SSL encrypted transactions</li>
              <li>• No stored payment data</li>
              <li>• Instant coin delivery</li>
              <li>• 24/7 customer support</li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Current Balance:</strong> {((user as any)?.coinsBalance || 0).toLocaleString()} coins
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              <strong>After Purchase:</strong> {(((user as any)?.coinsBalance || 0) + (selectedPkg?.coins || 0)).toLocaleString()} coins
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
