import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/AdminLogin";
import TeacherLogin from "./pages/TeacherLogin";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Appointments from "./pages/Appointments";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse text-lg font-medium">Loading...</div>
  </div>
);

// Protected route component that checks for admin role
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, userData } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || userData?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

// Protected route component that checks for teacher role
const TeacherRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, userData } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || userData?.role !== 'teacher') {
    return <Navigate to="/teacher/login" replace />;
  }

  return <>{children}</>;
};

// Protected route component that checks for student role
const StudentRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, userData } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || userData?.role !== 'student') {
    return <Navigate to="/auth?mode=login" replace />;
  }

  return <>{children}</>;
};

// Protected route component that checks for any authenticated user
const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Redirect to login with session expired flag
    return <Navigate to="/auth?mode=login&sessionExpired=true" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <BrowserRouter>
            <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route 
                path="/dashboard" 
                element={
                  <UserRoute>
                    <Dashboard />
                  </UserRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
              <Route 
                path="/appointments" 
                element={
                  <UserRoute>
                    <Appointments />
                  </UserRoute>
                } 
              />
              <Route 
                path="/appointments/:action" 
                element={
                  <UserRoute>
                    <Appointments />
                  </UserRoute>
                } 
              />
              <Route 
                path="/messages" 
                element={
                  <UserRoute>
                    <Messages />
                  </UserRoute>
                } 
              />
              {/* Role-specific profile routes */}
              <Route 
                path="/admin/profile" 
                element={
                  <AdminRoute>
                      <Navigate to="/admin" replace />
                  </AdminRoute>
                } 
              />
              <Route 
                path="/teacher/profile" 
                element={
                  <TeacherRoute>
                    <Profile />
                  </TeacherRoute>
                } 
              />
              <Route 
                path="/student/profile" 
                element={
                  <StudentRoute>
                    <Profile />
                  </StudentRoute>
                } 
              />
              {/* General profile route that redirects based on role */}
              <Route 
                path="/profile" 
                element={
                  <UserRoute>
                    <Profile />
                  </UserRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Layout>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
