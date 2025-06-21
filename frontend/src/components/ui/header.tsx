import { Button } from "@/components/ui/button";
import { User, Moon, Sun, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthDialog from "@/components/auth/AuthDialog";
import ProfileDropdown from "@/components/auth/ProfileDropdown";
import { useToast } from "@/components/ui/use-toast";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // Determine current page
  const currentPath = location.pathname;
  const isHomePage = currentPath === "/" || /^\/(groww|dhan|rise|others)/.test(currentPath);
  const isToolsPage = currentPath === "/tools";
  const isJournalPage = currentPath === "/journal" || currentPath.startsWith("/journal/");

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

  return (
    <nav className="relative border-b bg-gradient-to-r from-blue-100 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-md backdrop-blur-sm">
      <div className="absolute inset-0 bg-white/40 dark:bg-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold cursor-pointer text-blue-900 dark:text-blue-100 hover:text-primary transition-colors duration-300"
            onClick={() => navigate("/")}
          >
            TradeSmart
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Home button with active state */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className={`relative flex items-center gap-2 text-blue-800 dark:text-blue-100 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300 ${
              isHomePage ? "font-medium" : ""
            }`}
          >
            Home
            {isHomePage && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full"></div>
            )}
          </Button>

          {/* Tools button with active state */}
          <Button
            variant="ghost"
            onClick={() => navigate("/tools")}
            className={`relative flex items-center gap-2 text-blue-800 dark:text-blue-100 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300 ${
              isToolsPage ? "font-medium" : ""
            }`}
          >
            Tools
            {isToolsPage && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full"></div>
            )}
          </Button>

          {/* Journal button with active state */}
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
            className={`relative flex items-center gap-2 text-blue-800 dark:text-blue-100 hover:bg-blue-200/50 dark:hover:bg-blue-900/50 transition-all duration-300 ${
              isJournalPage ? "font-medium" : ""
            }`}
          >
            <BookOpen className="h-5 w-5" />
            Journal
            {isJournalPage && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full"></div>
            )}
          </Button>

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