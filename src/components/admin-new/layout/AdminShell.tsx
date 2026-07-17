'use client';

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminMobileNav from './AdminMobileNav';

interface AdminShellProps {
  children: React.ReactNode;
  user: { name?: string | null; role?: string | null };
}

export default function AdminShell({ children, user }: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#17201B] font-sans">
      <AdminSidebar 
        user={user} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />
      
      <AdminMobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        user={user} 
      />

      <div 
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-[236px]'
        }`}
      >
        <AdminHeader 
          onMenuClick={() => setMobileMenuOpen(true)} 
          user={user} 
        />
        
        <main className="flex-1 p-4 md:p-6 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
