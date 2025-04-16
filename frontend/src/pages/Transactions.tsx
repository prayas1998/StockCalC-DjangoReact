import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Transactions = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-secondary/50 dark:bg-secondary/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Your Transactions</h1>
              <p className="text-muted-foreground">
                View and manage your saved transactions
              </p>
            </div>
          </div>

          <Card className="p-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-2">No transactions yet</h3>
              <p className="text-muted-foreground mb-6">
                Your saved transactions will appear here
              </p>
              <Button onClick={() => navigate("/")}>
                Go back to calculator
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Transactions; 