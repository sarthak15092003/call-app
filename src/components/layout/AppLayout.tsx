'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ThemeProvider } from '@/components/theme/ThemeContext';
import { CallProvider } from '@/components/calling/CallContext';
import { ActiveCallBar } from '@/components/calling/ActiveCallBar';
import { DispositionModal } from '@/components/calling/DispositionModal';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <CallProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
          {/* Sidebar */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main Content Area */}
          <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
            <Header onToggleSidebar={() => setSidebarOpen(true)} />
            <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-32">
              {children}
            </main>
          </div>

          {/* Global Telephony Components */}
          <ActiveCallBar />
          <DispositionModal />
        </div>
      </CallProvider>
    </ThemeProvider>
  );
};
