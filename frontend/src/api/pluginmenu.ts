import { MenuItem } from '../components/Menu/types';

export type PluginMenuItem = MenuItem & { plugin?: string; parentTo?: string };

export function addPluginMenuItem(item: PluginMenuItem) {
  if (
    typeof window !== 'undefined' &&
    (
      window as unknown as {
        __addMenuItem?: (item: PluginMenuItem) => void;
        __addMenuChildItem?: (item: PluginMenuItem, parentTo: string) => void;
      }
    ).__addMenuItem
  ) {
    if (item.parentTo && (window as any).__addMenuChildItem) {
      (window as any).__addMenuChildItem(item, item.parentTo);
    } else {
      (window as unknown as { __addMenuItem?: (item: PluginMenuItem) => void }).__addMenuItem!(item);
    }
  }
}
