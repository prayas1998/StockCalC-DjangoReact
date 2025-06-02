import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Tools from "./pages/Tools";
import Transactions from "./pages/Transactions";
import NotFound from "./pages/NotFound";
import AuthCallback from './pages/AuthCallback';

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dhan" replace />} />
              <Route path="/groww" element={<Index />} />
              <Route path="/dhan" element={<Index />} />
              {/* <Route path="/rise" element={<Rise />} /> */}
              {/* <Route path="/others" element={<Others />} /> */}
              <Route path="/tools" element={<Tools />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/edit-transaction/:id" element={<Index />} />
              <Route path="*" element={<NotFound />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
