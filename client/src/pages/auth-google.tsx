import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Youtube, Coins, Star, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthGooglePage() {
  const [, setLocation] = useLocation();

  // Check if user is already authenticated
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (user && !isLoading) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  const handleGoogleLogin = () => {
    window.location.href = '/api/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <Youtube className="h-10 w-10 text-red-600 mr-3" />
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                WatchExchange
              </h1>
            </div>
            
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Earn Coins by Watching YouTube Videos
            </h2>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Join our community of content creators and viewers. Watch videos to earn coins, 
              then spend them to get your own content watched by real users.
            </p>

            {/* Features */}
            <div className="grid gap-4 mb-8">
              <div className="flex items-center">
                <Coins className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Earn coins for every video you watch
                </span>
              </div>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Boost your content for priority placement
                </span>
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  Real viewers, authentic engagement
                </span>
              </div>
            </div>

            <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-orange-800 dark:text-orange-200 font-medium">
                🎉 Welcome Bonus: Get 60 free coins when you sign up!
              </p>
            </div>
          </div>

          {/* Auth Card */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Sign In to Continue
                </CardTitle>
                <p className="text-center text-gray-600 dark:text-gray-300">
                  Use your Replit account to access YouTube videos and start earning coins
                </p>
              </CardHeader>
              <CardContent className="p-6">
                
                <Button 
                  onClick={handleGoogleLogin}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
                  variant="outline"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Replit
                </Button>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    By signing in, you agree to our terms of service and privacy policy
                  </p>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Why Replit?</strong> We use Replit authentication for secure access to the platform, 
                    enabling you to watch videos and interact with content directly in our app.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}