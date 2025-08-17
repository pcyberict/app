import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Home, Video, Upload, User, Coins, Settings, Menu, X, Sun, Moon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import NotificationBell from "@/components/NotificationBell";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { balance } = useBalance();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Get website configuration for site name
  const { data: websiteConfig } = useQuery({
    queryKey: ["/api/website-config/maintenance"],
  });

  // Check current theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Watch Queue", href: "/watch-queue", icon: Video },
    { name: "Submit Video", href: "/submit-video", icon: Upload },
    { name: "Account", href: "/account", icon: User },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Theme Toggle */}
            <div className="flex items-center space-x-4">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{websiteConfig?.siteName || "Y2Big"}</span>
                </div>
              </Link>
              
              {/* Theme Toggle Button - positioned after Y2Big title */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 hidden sm:flex"
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.name}</span>
                  </Button>
                </Link>
              ))}
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button
                    variant="ghost"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive("/admin")
                        ? "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="font-medium">Admin</span>
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Controls - Theme Toggle + Notification + Menu */}
            <div className="md:hidden flex items-center space-x-2">
              {/* Mobile Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 sm:hidden"
                data-testid="button-theme-toggle-mobile"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              
              {/* Mobile Notification Bell */}
              <NotificationBell />
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 dark:text-gray-300"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>

            {/* Desktop User Profile & Coins */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
              {/* Desktop Notification Bell */}
              <NotificationBell />
              {/* Coin Balance */}
              <Link href="/buy-coins">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-full px-3 lg:px-4 py-2 flex items-center space-x-2 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all duration-200 shadow-sm">
                  <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm lg:text-base">
                    {balance?.toLocaleString() || 0}
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400 text-xs lg:text-sm">coins</span>
                </div>
              </Link>

              {/* User Profile */}
              <Link href="/account">
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-all duration-200">
                  <img
                    src={
                      user?.profileImageUrl ||
                      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
                    }
                    alt="User profile"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
                  />
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email}</p>
                  </div>
                </div>
              </Link>

              {/* Notification Bell - moved to top right */}
              <NotificationBell />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 py-4 space-y-3">
              {/* Mobile Navigation */}
              <div className="space-y-2">
                {navigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                        isActive(item.href)
                          ? "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </Button>
                  </Link>
                ))}
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <Button
                      variant="ghost"
                      className={`w-full justify-start flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                        isActive("/admin")
                          ? "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">Admin</span>
                    </Button>
                  </Link>
                )}
              </div>

              {/* Mobile User Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                {/* Coin Balance */}
                <Link href="/buy-coins">
                  <div 
                    className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-gray-900 dark:text-white">My Coins</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-bold text-yellow-800 dark:text-yellow-300">
                        {balance?.toLocaleString() || 0}
                      </span>
                      <span className="text-yellow-600 dark:text-yellow-400 text-sm">coins</span>
                    </div>
                  </div>
                </Link>

                {/* User Profile */}
                <Link href="/account">
                  <div 
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <img
                      src={
                        user?.profileImageUrl ||
                        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
                      }
                      alt="User profile"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user?.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>

                {/* Mobile Logout Button */}
                <Button
                  variant="ghost"
                  className="w-full justify-start flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.location.href = '/api/auth/logout';
                  }}
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
