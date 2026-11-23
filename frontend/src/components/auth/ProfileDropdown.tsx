import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { User, LogOut, Receipt, BookOpen, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const ProfileDropdown = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const displayName =
    user?.user_metadata?.username ||
    user?.user_metadata?.first_name ||
    (user?.email ? user.email.split("@")[0] : "User");
  const accountIdentifier = user?.user_metadata?.username || user?.email || "Signed in";
  
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
  };
  
  return (
    <>
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {displayName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[240px] max-w-[320px] w-auto">
          <div className="p-2 text-sm font-medium text-muted-foreground break-words">
            {accountIdentifier}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer flex items-center gap-2"
            onClick={() => navigate("/profile")}
          >
            <Settings className="h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default ProfileDropdown;
