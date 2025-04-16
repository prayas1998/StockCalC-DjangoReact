import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm.tsx";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthDialog = ({ isOpen, onClose }: AuthDialogProps) => {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </DialogTitle>
        </DialogHeader>
        
        {mode === "login" ? (
          <LoginForm switchMode={() => setMode("signup")} onSuccess={onClose} />
        ) : (
          <SignupForm switchMode={() => setMode("login")} onSuccess={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
