import { Button } from "@/components/ui/button";
import { User, Moon, Sun, ChevronDown, BarChart, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthDialog from "@/components/auth/AuthDialog";
import ProfileDropdown from "@/components/auth/ProfileDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      return savedMode ? JSON.parse(savedMode) : false;
    }
    return false;
  });

  const [platform, setPlatform] = useState(() => {
    const path = window.location.pathname.slice(1);
    return path.charAt(0).toUpperCase() + path.slice(1) || "Groww";
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    navigate(`/${newPlatform.toLowerCase()}`);
  };

  return (
    <nav className="relative border-b bg-gradient-to-r from-blue-100 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-md backdrop-blur-sm">
      <div className="absolute inset-0 bg-white/40 dark:bg-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold cursor-pointer text-blue-900 dark:text-blue-100 hover:text-primary transition-colors duration-300"
            onClick={() => navigate("/dhan")}
          >
            TradeSmart
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/tools")}
            className="flex items-center gap-2 text-blue-800 dark:text-blue-100 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300"
          >
            Tools
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              if (user) {
                navigate("/journal");
              } else {
                setAuthDialogOpen(true);
                toast({
                  title: "Login Required",
                  description: "You need to be logged in to add/view journals.",
                  variant: "default"
                });
              }
            }}
            className="flex items-center gap-2 text-blue-800 dark:text-blue-100 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300"
          >
            <BookOpen className="h-5 w-5" />
            Journal
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-2 bg-white/50 dark:bg-gray-900/50 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300 border-blue-200 dark:border-gray-700"
              >
                {platform}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
              <DropdownMenuItem 
                onClick={() => handlePlatformChange("Groww")}
                className="hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors duration-200"
              >
                Groww
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handlePlatformChange("Dhan")}
                className="hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors duration-200"
              >
                Dhan
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handlePlatformChange("Rise")}
                className="hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors duration-200"
              >
                Rise
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handlePlatformChange("Others")}
                className="hover:bg-blue-100/50 dark:hover:bg-blue-900/50 transition-colors duration-200"
              >
                Others
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <ProfileDropdown />
          ) : (
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-blue-800 dark:text-blue-100 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300"
              onClick={() => setAuthDialogOpen(true)}
            >
              <User className="h-5 w-5" />
              Login
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full text-blue-800 dark:text-blue-100 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      
      <AuthDialog 
        isOpen={authDialogOpen} 
        onClose={() => setAuthDialogOpen(false)} 
      />
    </nav>
  );
};

export default Header;