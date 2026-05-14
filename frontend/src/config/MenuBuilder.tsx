import { MenuItem } from '../components/Menu/types';

export function getInitialMenuItems(): MenuItem[] {
  return [
    {
      label: 'Dashboard',
      to: '/',
      icon: (
        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12h18M3 6h18M3 18h18"
          />
        </svg>
      ),
    },
    {
      label: 'Plugins',
      to: '/plugins',
      icon: (
        // Windows-Logo-ähnliches Icon (vier Quadrate)
        <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="currentColor">
          <rect x="13" y="3" width="9" height="9" rx="1.5" />
          <rect x="2" y="13" width="9" height="9" rx="1.5" />
          <rect x="13" y="13" width="9" height="9" rx="1.5" />
        </svg>
      ),
    },
    {
      label: 'menu.settings',
      to: '/settings',
      icon: (
        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.99.602 2.282.142 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];
}
