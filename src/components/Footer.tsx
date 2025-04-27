import React from 'react';
import { Github, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 px-6 mt-auto bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Appointment Simplifier
        </p>
        <a 
          href="https://github.com/RogerrMonkey" 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 text-sm py-1 px-3 rounded-full",
            "bg-gradient-to-r from-background to-muted/40 hover:from-primary/10 hover:to-primary/5",
            "border border-border/50 hover:border-primary/20",
            "text-foreground/80 hover:text-primary transition-all duration-300",
            "shadow-sm hover:shadow"
          )}
        >
          <span className="flex items-center">
            Made with <Heart className="h-3 w-3 mx-1 text-red-500 animate-pulse" /> by RogerrMonkey
          </span>
          <Github className="h-4 w-4" />
        </a>
      </div>
    </footer>
  );
} 