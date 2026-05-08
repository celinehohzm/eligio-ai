import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import ExternalProviderUpload from "./pages/ExternalProviderUpload";
import ReferralQueue from "./pages/ReferralQueue";
import SpecialistsList from "./pages/SpecialistsList";
import NotFound from "./pages/NotFound";
import { CHAT_ALLOWED_ROLES, REFERRAL_SEARCH_ALLOWED_ROLES, UPLOAD_ALLOWED_ROLES } from "@/lib/roles";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="eligio-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute allowedRoles={CHAT_ALLOWED_ROLES}>
                    <Chat />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/external-provider-upload" 
                element={
                  <ProtectedRoute allowedRoles={UPLOAD_ALLOWED_ROLES}>
                    <ExternalProviderUpload />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/referral-queue"
                element={
                  <ProtectedRoute allowedRoles={REFERRAL_SEARCH_ALLOWED_ROLES}>
                    <ReferralQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/specialists-list"
                element={
                  <ProtectedRoute allowedRoles={REFERRAL_SEARCH_ALLOWED_ROLES}>
                    <SpecialistsList />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
