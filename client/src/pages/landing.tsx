import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Users, 
  BarChart3, 
  Heart, 
  MessageCircle, 
  Share, 
  Star,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Landing() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  const handleAppleLogin = () => {
    // Apple login would be implemented here - for now redirect to Google
    window.location.href = "/auth/google";
  };

  const handleContinue = () => {
    if (currentScreen === 0) {
      setCurrentScreen(1);
      setShowFeatures(true);
    } else if (currentScreen === 1) {
      setCurrentScreen(2);
    } else {
      handleGoogleLogin();
    }
  };

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Social Media Growth",
      description: "Accelerate your reach across all platforms"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Auto Engagement",
      description: "Likes, comments, and shares on autopilot"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Real-Time Analytics",
      description: "Track your growth with detailed insights"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white overflow-hidden relative">
      {/* Background glow effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {currentScreen === 0 && (
            <motion.div
              key="screen1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex-1 flex flex-col justify-between p-6 py-12"
            >
              {/* Header */}
              <div className="flex justify-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-lg font-semibold tracking-wide"
                >
                  WatchExchange
                </motion.div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
                  className="mb-8"
                >
                  <div className="w-24 h-24 bg-gradient-to-r from-red-600 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                  
                  <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    WatchExchange
                  </h1>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Boost Your Social Reach
                  </p>
                </motion.div>

                {/* Badge */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mb-8"
                >
                  <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 border border-emerald-500/30 rounded-full px-6 py-3 backdrop-blur-sm text-[14px] pt-[11px] pb-[11px] pl-[50px] pr-[50px]">
                    ✨Social Engagement Platform
                  </div>
                </motion.div>

                {/* Auth Buttons */}
                <motion.div 
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="w-full max-w-sm space-y-4"
                >
                  <Button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all duration-300 py-4 text-lg font-medium rounded-2xl"
                    variant="outline"
                  >
                    <img 
                      src="https://developers.google.com/identity/images/g-logo.png" 
                      alt="Google" 
                      className="w-6 h-6 mr-3" 
                    />
                    Sign in with Google
                  </Button>

                  <Button
                    onClick={handleAppleLogin}
                    className="w-full bg-black/50 backdrop-blur-sm border border-gray-600 text-white hover:bg-black/70 transition-all duration-300 py-4 text-lg font-medium rounded-2xl"
                    variant="outline"
                  >
                    <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Sign in with Apple
                  </Button>
                </motion.div>
              </div>

              {/* Continue Button */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="space-y-6"
              >
                <Button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold py-4 text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <p className="text-xs text-gray-500 text-center px-4">
                  By proceeding, you agree to our{" "}
                  <span className="text-emerald-400 cursor-pointer">Terms of Use</span> and{" "}
                  <span className="text-emerald-400 cursor-pointer">Privacy Policy</span>
                </p>
              </motion.div>
            </motion.div>
          )}

          {currentScreen === 1 && (
            <motion.div
              key="screen2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex-1 flex flex-col justify-between p-6 py-12"
            >
              {/* Header */}
              <div className="flex justify-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-lg font-semibold tracking-wide"
                >
                  Features
                </motion.div>
              </div>

              {/* Feature Cards */}
              <div className="flex-1 flex flex-col justify-center items-center">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-3xl font-bold text-center mb-4"
                >
                  Powerful Features
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-gray-400 text-center mb-12 px-4"
                >
                  Everything you need to grow your social presence
                </motion.p>

                <div className="w-full max-w-sm space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ y: 50, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ 
                        delay: 0.5 + index * 0.15, 
                        duration: 0.5,
                        type: "spring",
                        stiffness: 100
                      }}
                      className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:from-white/15 hover:to-white/10 transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl p-3 flex-shrink-0">
                          {feature.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                          <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Continue Button */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <Button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold py-4 text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {currentScreen === 2 && (
            <motion.div
              key="screen3"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex-1 flex flex-col justify-between p-6 py-12"
            >
              {/* Header */}
              <div className="flex justify-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-lg font-semibold tracking-wide"
                >
                  Join Now
                </motion.div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6, type: "spring" }}
                  className="mb-8"
                >
                  <div className="w-32 h-32 bg-gradient-to-r from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Eye className="h-16 w-16 text-white" />
                  </div>
                  
                  <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Ready to Grow?
                  </h1>
                  <p className="text-gray-400 text-lg leading-relaxed px-4">
                    Join thousands of creators already boosting their reach
                  </p>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="grid grid-cols-3 gap-6 w-full max-w-sm mb-8"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">10K+</div>
                    <div className="text-xs text-gray-500">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">1M+</div>
                    <div className="text-xs text-gray-500">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">99%</div>
                    <div className="text-xs text-gray-500">Growth</div>
                  </div>
                </motion.div>
              </div>

              {/* Final Continue Button */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="space-y-4"
              >
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold py-4 text-lg rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <img 
                    src="https://developers.google.com/identity/images/g-logo.png" 
                    alt="Google" 
                    className="w-6 h-6 mr-3" 
                  />
                  Continue with Google
                </Button>

                <Button
                  onClick={handleAppleLogin}
                  className="w-full bg-black/50 backdrop-blur-sm border border-gray-600 text-white hover:bg-black/70 transition-all duration-300 py-4 text-lg font-medium rounded-2xl"
                  variant="outline"
                >
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Sign in with Apple
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
