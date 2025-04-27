import React from 'react';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
} 