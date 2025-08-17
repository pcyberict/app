import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CoinSplashProps {
  show: boolean;
  amount: number;
  onComplete: () => void;
  type?: "earn" | "payment" | "bonus";
}

export default function CoinSplash({ show, amount, onComplete, type = "earn" }: CoinSplashProps) {
  const [flowers, setFlowers] = useState<Array<{ id: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      // Create multiple flower/coin animations
      const flowerArray = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        delay: i * 0.1,
      }));
      setFlowers(flowerArray);

      // Auto complete after animation
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  const getColor = () => {
    switch (type) {
      case "payment": return "text-green-500";
      case "bonus": return "text-purple-500";
      default: return "text-yellow-500";
    }
  };

  const getMessage = () => {
    switch (type) {
      case "payment": return "Payment Successful!";
      case "bonus": return "Bonus Earned!";
      default: return "Coins Earned!";
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm"
          onClick={onComplete}
        >
          <div className="relative">
            {/* Central coin display */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.6, ease: "backOut" }}
              className="bg-white rounded-full p-8 shadow-2xl text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className={`w-16 h-16 mx-auto mb-4 ${getColor()} bg-yellow-100 rounded-full flex items-center justify-center`}
              >
                <Coins className="h-10 w-10" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-gray-900 mb-2"
              >
                {getMessage()}
              </motion.h2>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={`text-3xl font-bold ${getColor()}`}
              >
                +{amount.toLocaleString()} coins
              </motion.p>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-gray-500 mt-2"
              >
                Click to continue
              </motion.p>
            </motion.div>

            {/* Floating flowers/sparkles around */}
            {flowers.map((flower) => (
              <motion.div
                key={flower.id}
                initial={{
                  scale: 0,
                  x: 0,
                  y: 0,
                  rotate: 0,
                }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.random() * 400 - 200,
                  y: Math.random() * 400 - 200,
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  delay: flower.delay,
                  ease: "easeOut",
                }}
                className="absolute top-1/2 left-1/2 pointer-events-none"
              >
                <div className="w-8 h-8 text-yellow-400">
                  {type === "bonus" ? "🎉" : type === "payment" ? "💎" : "🌸"}
                </div>
              </motion.div>
            ))}

            {/* Expanding ring effect */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-yellow-300 rounded-full pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 2, delay: 0.2, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-yellow-400 rounded-full pointer-events-none"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}