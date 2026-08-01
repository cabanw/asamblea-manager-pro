import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import Attendance from "./pages/Attendance";
import MemberManager from "./pages/MemberManager";
import AdminReports from "./pages/AdminReports";
import AdminSettings from "./pages/AdminSettings";
import AdminElections from "./pages/AdminElections";
import ElectionDetailAdmin from "./pages/ElectionDetailAdmin";
import ElectionsPublic from "./pages/ElectionsPublic";
import VotingBooth from "./pages/VotingBooth";
import ElectionResults from "./pages/ElectionResults";
import NotFound from "./pages/NotFound";
import PublicRegistration from './pages/PublicRegistration';
import RegistrationSuccess from './pages/RegistrationSuccess';
import NominationBooth from './pages/NominationBooth';
import AboutDeveloper from './pages/AboutDeveloper';

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background flex flex-col">
    <Header />
    <main className="flex-1">{children}</main>
    <footer className="py-6 border-t border-border mt-auto bg-card">
      <div className="container mx-auto px-4 text-center">
        <a href="/developer" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
          <span>&lt;/&gt;</span>
          Desarrollado por Wilfredo Caban
        </a>
      </div>
    </footer>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register/:token" element={<PublicRegistration />} />
            <Route path="/registration-success" element={<RegistrationSuccess />} />
            <Route
              path="/"
              element={
                <AppLayout>
                  <Index />
                </AppLayout>
              }
            />
            <Route
              path="/register"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Register />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={['assembly_sergeant', 'admin']}>
                  <AppLayout>
                    <Attendance />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute allowedRoles={['admin', 'assembly_sergeant', 'secretary']}>
                  <AppLayout>
                    <MemberManager />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/elections"
              element={
                <AppLayout>
                  <ElectionsPublic />
                </AppLayout>
              }
            />
            <Route
              path="/elections/:id/vote"
              element={
                <AppLayout>
                  <VotingBooth />
                </AppLayout>
              }
            />
            <Route
              path="/elections/:id/nominate"
              element={
                <AppLayout>
                  <NominationBooth />
                </AppLayout>
              }
            />
            <Route
              path="/elections/:id/results"
              element={
                <AppLayout>
                  <ElectionResults />
                </AppLayout>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout>
                    <AdminReports />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout>
                    <AdminSettings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/elections"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout>
                    <AdminElections />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/elections/:id"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AppLayout>
                    <ElectionDetailAdmin />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer"
              element={
                <AppLayout>
                  <AboutDeveloper />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
