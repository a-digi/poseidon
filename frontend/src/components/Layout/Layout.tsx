import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from '../TopBar';
import { BottomBar } from '../MultiThread';
import { ContentArea } from './ContentArea';
import { LayoutProps } from './types';
import { useTranslation } from 'react-i18next';
import { AppUpdateBanner } from '../AppUpdateBanner/AppUpdateBanner';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWide, setSidebarWide] = useState(true); // true = wide, false = narrow
  const { t } = useTranslation();
  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const closeSidebar = () => setSidebarOpen(false);
  const handleSidebarResize = () => setSidebarWide((wide) => !wide);

  return (
    <div className="flex w-full h-screen">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        onResize={handleSidebarResize}
        wide={sidebarWide}
      />
      <div className="flex flex-col flex-1 h-full">
        <TopBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <AppUpdateBanner />
        <main className="flex-1 p-1 md:p-2 overflow-auto">
          <ContentArea>
            {children}
          </ContentArea>
        </main>
        <BottomBar />
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
          onClick={closeSidebar}
          aria-label={t('layout.closeSidebarOverlay', 'Close sidebar overlay')}
        />
      )}
    </div>
  );
};
