
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface NavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  isMobile?: boolean;
}

const NavLink = ({ to, label, icon, isMobile = false }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-secondary",
        isMobile && "w-full justify-center text-lg py-4"
      )}
    >
      {icon}
      <span className={cn(
        "font-medium",
        !isActive && "group-hover:translate-x-0.5 transition-transform"
      )}>
        {label}
      </span>
    </Link>
  );
};

export default function Navbar() {
  const { isAuthenticated, currentUser, userData, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Close mobile menu when navigating
  const location = useLocation();
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!userData?.displayName) return 'U';
    return userData.displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 px-6 transition-all duration-300",
        isScrolled 
          ? "bg-background/80 backdrop-blur-md shadow-sm" 
          : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 font-semibold text-xl"
          >
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              EduMeet
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <NavLink to="/" label="Home" icon={<HomeIcon className="w-4 h-4" />} />
                <NavLink to="/appointments" label="Appointments" icon={<CalendarIcon className="w-4 h-4" />} />
                <NavLink to="/messages" label="Messages" icon={<MessageSquareIcon className="w-4 h-4" />} />
              </>
            ) : (
              <>
                <NavLink to="/" label="Home" icon={<HomeIcon className="w-4 h-4" />} />
                <NavLink to="/auth" label="Sign In" icon={<UserIcon className="w-4 h-4" />} />
              </>
            )}
          </nav>
          
          {/* User Menu or Auth Buttons */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 animate-scale-in">
                      <AvatarImage src={userData?.photoURL} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userData?.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button asChild variant="ghost">
                  <Link to="/auth?mode=login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth?mode=register">Sign Up</Link>
                </Button>
              </div>
            )}
            
            {/* Mobile menu toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <XIcon className="h-6 w-6" />
              ) : (
                <MenuIcon className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 pt-20 bg-background animate-fade-in md:hidden">
          <div className="flex flex-col items-center gap-2 p-4">
            {isAuthenticated ? (
              <>
                <NavLink to="/" label="Home" icon={<HomeIcon className="w-5 h-5" />} isMobile />
                <NavLink to="/appointments" label="Appointments" icon={<CalendarIcon className="w-5 h-5" />} isMobile />
                <NavLink to="/messages" label="Messages" icon={<MessageSquareIcon className="w-5 h-5" />} isMobile />
                <NavLink to="/profile" label="Profile" icon={<UserIcon className="w-5 h-5" />} isMobile />
                <Button 
                  variant="destructive" 
                  className="w-full mt-4 flex items-center justify-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOutIcon className="w-5 h-5" />
                  Log out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/" label="Home" icon={<HomeIcon className="w-5 h-5" />} isMobile />
                <div className="flex flex-col w-full gap-2 mt-4">
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link to="/auth?mode=login">Sign In</Link>
                  </Button>
                  <Button asChild size="lg" className="w-full">
                    <Link to="/auth?mode=register">Sign Up</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Spacer to prevent content from going under the navbar */}
      <div className="h-16" />
    </>
  );
}
