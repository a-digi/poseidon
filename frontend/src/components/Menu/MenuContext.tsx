import { createContext, useContext, useState, ReactNode } from 'react';
import { getInitialMenuItems } from '../../config/MenuBuilder';
import { MenuItem } from './types';

interface MenuContextType {
  items: MenuItem[];
  addItem: (item: MenuItem) => void;
  reset: () => void;
  reloadMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within a MenuProvider');
  return ctx;
};

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<MenuItem[]>(getInitialMenuItems());

  const addItem = (item: MenuItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.to === item.to)) return prev;
      return [...prev, item];
    });
  };

  const reset = () => setItems(items.slice(0, 1)); // Nur Dashboard behalten

  const reloadMenu = () => {
    setItems(getInitialMenuItems());
  };

  // Registrierung im globalen Fensterobjekt für Plugins
  if (typeof window !== 'undefined') {
    (window as unknown as { __addMenuItem?: (item: MenuItem) => void }).__addMenuItem = addItem;
    (window as unknown as { __addMenuChildItem?: (item: MenuItem, parentTo: string) => void })
      .__addMenuChildItem = (item: MenuItem, parentTo: string) => {
      setItems((prev) =>
        prev.map((menu) => {
          if (menu.to === parentTo) {
            const children = Array.isArray(menu.children) ? menu.children : [];
            if (children.some((c) => c.to === item.to)) return menu;
            return { ...menu, children: [...children, item] };
          }
          return menu;
        })
      );
    };
  }

  return (
    <MenuContext.Provider value={{ items, addItem, reset, reloadMenu }}>
      {children}
    </MenuContext.Provider>
  );
};
