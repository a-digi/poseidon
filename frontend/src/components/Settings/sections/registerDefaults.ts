import { registerSettingsSection } from '../SettingsContext';
import System from './System';
import SystemUpdate from './SystemUpdate';
import QueueManager from './QueueManager';

registerSettingsSection({
  id: 'system',
  label: 'settings.system.title',
  order: 0,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  component: System,
});

registerSettingsSection({
  id: 'system-update',
  label: 'settings.systemUpdate.title',
  order: 5,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>',
  component: SystemUpdate,
});

registerSettingsSection({
  id: 'queue-manager',
  label: 'settings.queueManager.title',
  order: 10,
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="3" rx="1"/><rect x="3" y="11" width="18" height="3" rx="1"/><rect x="3" y="16" width="18" height="3" rx="1"/></svg>',
  component: QueueManager,
});
