import type { MenuItem } from '../components/Menu/types';

export function addMenuItem(item: MenuItem) {
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { __addMenuItem?: (item: MenuItem) => void }).__addMenuItem ===
      'function'
  ) {
    (window as unknown as { __addMenuItem: (item: MenuItem) => void }).__addMenuItem(item);
  } else {
    console.warn('addMenuItem: MenuContext ist noch nicht initialisiert.');
  }
}
