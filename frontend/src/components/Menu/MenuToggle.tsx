import React from 'react';
import { useSidebar } from '../Layout/Sidebar/SidebarContext';

const MenuToggle: React.FC = () => {
  const { wide, toggleWide } = useSidebar();
  return (
    <button
      type="button"
      aria-label={wide ? 'Menü minimieren' : 'Menü maximieren'}
      onClick={toggleWide}
      className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
      tabIndex={0}
    >
      <svg
        className="w-6 h-6 text-gray-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <>
          <line x1="4" y1="6" x2="20" y2="6" strokeWidth={2} stroke="currentColor" />
          <line x1="4" y1="12" x2="20" y2="12" strokeWidth={2} stroke="currentColor" />
          <line x1="4" y1="18" x2="20" y2="18" strokeWidth={2} stroke="currentColor" />
        </>
      </svg>
    </button>
  );
};

export default MenuToggle;
