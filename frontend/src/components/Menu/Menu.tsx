import React, { useState } from 'react';
import { MenuProps, MenuItem } from './types';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMenu } from './MenuContext';
import { useSidebar } from '../Layout/Sidebar/SidebarContext';
import { useMultiThread } from '../MultiThread/MultiThreadContext';
import { useLoadedPlugins } from '../Plugin/LoadedPluginsContext';

function MenuIcon({ icon }: { icon?: React.ReactNode | string }) {
  if (!icon) return null;
  if (typeof icon === 'string') {
    if (icon.trim().startsWith('<svg')) {
      return <span className="w-6 h-6 flex items-center" dangerouslySetInnerHTML={{ __html: icon }} />;
    }
    return <img src={icon} className="w-6 h-6" alt="" />;
  }
  return <>{icon}</>;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ml-auto transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function MenuList({
  items,
  compact,
  showText,
  depth = 0,
  wide,
}: {
  items: MenuItem[];
  compact?: boolean;
  showText?: boolean;
  depth?: number;
  wide: boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});
  const { openPluginInTab, openBuiltInTab } = useMultiThread();
  const loadedPlugins = useLoadedPlugins();

  const handleToggle = (label: string) => {
    setOpenItems((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handlePluginClick = (e: React.MouseEvent, to: string) => {
    if (to === '/') {
      e.preventDefault();
      openBuiltInTab('dashboard');
      return;
    }
    if (to === '/plugins') {
      e.preventDefault();
      openBuiltInTab('plugins');
      return;
    }
    if (to === '/settings') {
      e.preventDefault();
      openBuiltInTab('settings');
      return;
    }
    const matched = loadedPlugins.find((p) => p.path === to);
    if (matched) {
      e.preventDefault();
      openPluginInTab(matched.id);
    }
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = !!openItems[item.label];
        const isActive = location.pathname === item.to;
        const paddingLeft = depth * 30;
        // Wenn Sidebar minimal ist, nur Icons und nur erste Ebene anzeigen
        if (!wide && depth > 0) return null;
        return (
          <li key={item.label} style={{ marginLeft: paddingLeft }} className="relative">
            <div className="flex items-center relative">
              {item.to ? (
                <NavLink
                  to={item.to}
                  onClick={(e) => item.to && handlePluginClick(e, item.to)}
                  className={() =>
                    `group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 hover:bg-blue-100 hover:text-blue-700 ${compact ? 'flex-col p-2 w-12 h-12 justify-center' : 'font-medium text-gray-900'} ${isActive ? 'bg-blue-200 font-bold' : ''}`
                  }
                >
                  <MenuIcon icon={item.icon} />
                  {/* Nur Text anzeigen, wenn Sidebar weit ist */}
                  {wide &&
                    (compact && !showText ? null : (
                      <span
                        className={`${compact ? 'text-xs mt-1' : 'text-base'} group-hover:font-bold`}
                      >
                        {t(item.label)}
                      </span>
                    ))}
                </NavLink>
              ) : (
                <div
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 hover:bg-blue-100 hover:text-blue-700 ${compact ? 'flex-col p-2 w-12 h-12 justify-center' : 'font-medium text-gray-900'} ${isActive ? 'bg-blue-200 font-bold' : ''}`}
                >
                  <MenuIcon icon={item.icon} />
                  {/* Nur Text anzeigen, wenn Sidebar weit ist */}
                  {wide &&
                    (compact && !showText ? null : (
                      <span
                        className={`cursor-pointer ${compact ? 'text-xs mt-1' : 'text-base'} group-hover:font-bold`}
                      >
                        {t(item.label)}
                      </span>
                    ))}
                </div>
              )}
              {/* Chevron und Children nur anzeigen, wenn Sidebar weit ist */}
              {hasChildren && wide && (
                <button
                  type="button"
                  onClick={() => handleToggle(item.label)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 focus:outline-none"
                >
                  <Chevron open={isOpen} />
                </button>
              )}
            </div>
            {/* Children nur anzeigen, wenn Sidebar weit ist */}
            {hasChildren && isOpen && wide && (
              <MenuList
                items={item.children!}
                compact={compact}
                showText={showText}
                depth={depth + 1}
                wide={wide}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export const Menu: React.FC<MenuProps & { showText?: boolean }> = ({
  compact,
  showText = true,
}) => {
  const { items } = useMenu();
  const { wide } = useSidebar();
  return (
    <nav className={`flex flex-col gap-2 ${compact ? 'items-center' : ''}`}>
      <MenuList items={items} compact={compact} showText={showText} wide={wide} />
    </nav>
  );
};
