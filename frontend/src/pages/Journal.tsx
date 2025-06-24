import JournalPage from "./JournalPage";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/ui/header";
import { JournalErrorBoundary } from "@/components/journal";

const Journal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

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