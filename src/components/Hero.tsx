
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CalendarIcon, CheckIcon, MessageSquareIcon, UsersIcon } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <CalendarIcon className="h-10 w-10 text-primary" />,
    title: "Easy Scheduling",
    description: "Book appointments with teachers with just a few clicks, any time of day."
  },
  {
    icon: <MessageSquareIcon className="h-10 w-10 text-primary" />,
    title: "Direct Messaging",
    description: "Communicate directly with teachers about appointments and queries."
  },
  {
    icon: <UsersIcon className="h-10 w-10 text-primary" />,
    title: "Student-Teacher Connection",
    description: "Build better relationships through organized meetings and discussions."
  }
];

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    if (heroRef.current) {
      observer.observe(heroRef.current);
    }
    
    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);
  
  return (
    <div className="overflow-hidden" ref={heroRef}>
      {/* Hero Section */}
      <div className="relative">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-10 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl opacity-70" />
          <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl opacity-70" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-24 sm:pt-12 md:pt-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="inline-flex px-4 py-1 bg-muted rounded-full text-sm font-medium text-muted-foreground cursor-default transform hover:scale-105 transition-transform">
                <span className="animate-pulse rounded-full bg-green-500 w-2 h-2 mt-1.5 mr-2" />
                Simplified Student-Teacher Appointments
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Connect with teachers
                <span className="text-primary"> effortlessly</span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Schedule appointments, send messages, and manage your academic interactions all in one place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="group">
                  <Link to="/auth?mode=register">
                    Get Started
                    <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/auth?mode=login">
                    Sign In
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-4 pt-6">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                      <span className="text-xs font-medium">{['S', 'T', 'A', '+'][i]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Trusted by hundreds of <span className="font-medium text-foreground">students</span> and <span className="font-medium text-foreground">teachers</span>
                </p>
              </div>
            </div>
            
            {/* Hero Image/Card */}
            <div className="relative animate-slide-up animation-delay-300">
              <div className="relative z-10 bg-card rounded-2xl shadow-lg overflow-hidden border">
                <div className="bg-muted p-4 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-sm font-medium mx-auto pr-8">Upcoming Appointments</div>
                </div>
                
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                      <div className="w-12 h-12 flex-shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{['Physics Consultation', 'Math Homework Review', 'Project Discussion'][i]}</div>
                        <div className="text-sm text-muted-foreground">
                          {['Tomorrow, 2:00 PM', 'Friday, 10:30 AM', 'Next week, 3:15 PM'][i]}
                        </div>
                      </div>
                      <div className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        ['bg-green-100 text-green-800', 'bg-blue-100 text-blue-800', 'bg-amber-100 text-amber-800'][i]
                      )}>
                        {['Confirmed', 'Pending', 'Scheduled'][i]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Decorative elements behind the card */}
              <div className="absolute top-4 right-4 w-full h-full bg-primary/10 rounded-2xl -z-10"></div>
              <div className="absolute top-8 right-8 w-full h-full bg-muted rounded-2xl -z-20"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col gap-4 p-6 rounded-xl border bg-card hover:shadow-md transition-all",
              isVisible && "animate-scale-in"
            )}
            style={{ animationDelay: `${100 * index}ms` }}
          >
            <div className="p-3 rounded-lg bg-primary/10 w-fit">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
      
      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-primary/5 rounded-2xl p-8 md:p-12 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/10 filter blur-3xl opacity-70 -mb-32 -ml-32"></div>
          
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to streamline your academic interactions?</h2>
            <p className="text-xl mb-8 text-muted-foreground">Join EduMeet today and experience a new way to connect with teachers and manage your appointments.</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="group">
                <Link to="/auth?mode=register">
                  Create Your Account
                  <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
