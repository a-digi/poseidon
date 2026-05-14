import React from 'react';
import { SidebarProps } from './types';
import { Menu } from '../../Menu';
import { useSidebar } from './SidebarContext';

export const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const { wide } = useSidebar();
  const sidebarWidthClass = open || window.innerWidth >= 768 ? (wide ? 'w-64' : 'w-20') : 'w-0';

  return (
    <aside
      className={`fixed bg-gray-100 md:static top-0 left-0 h-full z-40 border-r flex flex-col transition-all duration-300
        ${sidebarWidthClass}
        md:relative md:shadow-none
      `}
      style={{ height: '100vh' }}
      aria-hidden={!open && window.innerWidth < 768}
    >
      <div className={`${sidebarWidthClass} fixed pt-10`}>
        <div className="hidden md:flex items-center mb-4 px-4">
          <img src="/logo.svg" alt="T-DIGI Poseidon" style={wide ? { width: 180 } : undefined} />
        </div>
      </div>
      <div style={{ marginTop: '12rem' }} className="flex-1 overflow-y-auto px-4 pb-4">
        {open || window.innerWidth >= 768 ? (
          <Menu compact={!wide} />
        ) : (
          <div className="flex flex-col items-center justify-start h-full p-4">
            <Menu compact showText={false} />
          </div>
        )}
      </div>
    </aside>
  );
};
