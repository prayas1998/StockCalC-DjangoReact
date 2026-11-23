import JournalPage from "./JournalPage";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/ui/header";
import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { JournalErrorBoundary } from "@/components/journal";

const Journal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setAuthDialogOpen(true);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Login required</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Sign in to view and manage your trading journal.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => setAuthDialogOpen(true)}>Login</Button>
            <Button variant="ghost" onClick={() => navigate("/dhan")}>
              Back to Home
            </Button>
          </div>
        </div>
        <AuthDialog isOpen={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <JournalErrorBoundary>
        <JournalPage />
      </JournalErrorBoundary>
    </div>
  );
};

export default Journal;
