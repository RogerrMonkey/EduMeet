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
  ShieldIcon,
  BookIcon,
  GraduationCapIcon,
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
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  isMobile?: boolean;
  badge?: number;
}

const NavLink = ({ to, label, icon, isMobile = false, badge }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 relative",
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
      
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-xs font-medium",
          isActive ? "bg-background text-foreground" : "bg-primary text-primary-foreground"
        )}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
};

export default function Navbar() {
  const { isAuthenticated, userData, currentUser, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  
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
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);
  
  // Get unread message count
  useEffect(() => {
    if (isAuthenticated && currentUser && userData) {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUser.uid)
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let total = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only count as unread if the conversation has unread messages
          if (data.unreadCount && typeof data.unreadCount === 'number') {
            total += data.unreadCount;
          }
        });
        
        setUnreadCount(total);
      });
      
      return () => unsubscribe();
    }
    
    return undefined;
  }, [isAuthenticated, currentUser, userData]);
  
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
  
  // Get profile path based on user role
  const getProfilePath = (role?: string) => {
    switch (role) {
      case 'admin':
        return '/admin/profile';
      case 'teacher':
        return '/teacher/profile';
      case 'student':
        return '/student/profile';
      default:
        return '/profile';
    }
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
          
          {/* Right Side: Nav links and User Menu */}
          <div className="flex items-center gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2 mr-2">
              {isAuthenticated ? (
                <>
                  <NavLink to="/" label="Home" icon={<HomeIcon className="w-4 h-4" />} />
                  {userData?.role === 'admin' ? (
                    <NavLink to="/admin" label="Admin" icon={<UserIcon className="w-4 h-4" />} />
                  ) : (
                    <>
                      <NavLink to="/dashboard" label="Dashboard" icon={<UserIcon className="w-4 h-4" />} />
                      <NavLink to="/appointments" label="Appointments" icon={<CalendarIcon className="w-4 h-4" />} />
                      <NavLink 
                        to="/messages" 
                        label="Messages" 
                        icon={<MessageSquareIcon className="w-4 h-4" />}
                        badge={unreadCount}
                      />
                    </>
                  )}
                </>
              ) : (
                <NavLink to="/" label="Home" icon={<HomeIcon className="w-4 h-4" />} />
              )}
            </nav>
            
            {/* User Menu or Auth Buttons */}
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
                  {userData?.role !== 'admin' && (
                    <>
                  <DropdownMenuItem asChild>
                    <Link to={getProfilePath(userData?.role)} className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 mr-2">
                      <div className="flex items-center gap-1">
                        <GraduationCapIcon className="h-3.5 w-3.5" />
                        Student
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link to="/auth?mode=login" className="cursor-pointer">
                        Login
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/auth?mode=register" className="cursor-pointer">
                        Register
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button asChild variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 mr-2">
                  <Link to="/teacher/login" className="flex items-center gap-1">
                    <BookIcon className="h-3.5 w-3.5" />
                    Teacher
                  </Link>
                </Button>
                
                <Button asChild variant="default" size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <Link to="/admin/login" className="flex items-center gap-1">
                    <ShieldIcon className="h-3.5 w-3.5" />
                    Admin
                  </Link>
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
                {userData?.role === 'admin' ? (
                  <NavLink to="/admin" label="Admin" icon={<UserIcon className="w-5 h-5" />} isMobile />
                ) : (
                  <>
                    <NavLink to="/dashboard" label="Dashboard" icon={<UserIcon className="w-5 h-5" />} isMobile />
                    <NavLink to="/appointments" label="Appointments" icon={<CalendarIcon className="w-5 h-5" />} isMobile />
                    <NavLink 
                      to="/messages" 
                      label="Messages" 
                      icon={<MessageSquareIcon className="w-5 h-5" />}
                      isMobile
                    />
                    <NavLink 
                      to={getProfilePath(userData?.role)} 
                      label="Profile" 
                      icon={<UserIcon className="w-5 h-5" />} 
                      isMobile 
                    />
                  </>
                )}
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
                  <div className="flex flex-col">
                    <Button asChild variant="default" size="lg" className="w-full bg-blue-600 hover:bg-blue-700 mb-1">
                      <div className="flex items-center justify-center gap-2">
                        <GraduationCapIcon className="h-4 w-4" />
                        Student Options
                      </div>
                    </Button>
                    <div className="pl-4 flex flex-col gap-1 mt-1 mb-3">
                      <Button asChild variant="outline" size="sm" className="w-full justify-start">
                        <Link to="/auth?mode=login">Login</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="w-full justify-start">
                        <Link to="/auth?mode=register">Register</Link>
                      </Button>
                    </div>
                  </div>
                  
                  <Button asChild size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <Link to="/teacher/login">Teacher Login</Link>
                  </Button>
                  <Button asChild size="lg" className="w-full bg-amber-600 hover:bg-amber-700">
                    <Link to="/admin/login">Admin Login</Link>
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
