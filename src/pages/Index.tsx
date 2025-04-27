import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import { logEvent } from '@/lib/firebase';

export default function Index() {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Log page view for analytics
    logEvent('Home page viewed');
    
    // Only redirect if explicitly navigated via a dashboard link (not direct home access)
    // or if redirected from another page (not direct navigation)
    const isFromDashboardLink = new URLSearchParams(location.search).get('from') === 'dashboard';
    const isDirectNavigation = location.key === 'default';
    
    if (isAuthenticated && !isLoading && userData && (isFromDashboardLink || (!isDirectNavigation && location.state?.redirect))) {
      const route = userData.role === 'admin' ? '/admin' : '/dashboard';
      navigate(route);
    }
  }, [isAuthenticated, isLoading, navigate, userData, location]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg font-medium">Loading...</div>
      </div>
    );
  }
  
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      
      <footer className="py-10 border-t">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">EduMeet</span>
              <span className="text-muted-foreground">© {currentYear}</span>
            </div>
            
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
