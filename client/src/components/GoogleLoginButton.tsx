import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";

interface GoogleLoginButtonProps {
  className?: string;
}

export default function GoogleLoginButton({ className = "" }: GoogleLoginButtonProps) {
  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/auth/google';
  };

  return (
    <Button
      onClick={handleGoogleLogin}
      variant="outline"
      className={`w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      <FcGoogle className="h-5 w-5" />
      <span className="font-medium">Continue with Google</span>
    </Button>
  );
}