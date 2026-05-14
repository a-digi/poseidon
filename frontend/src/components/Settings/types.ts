import type { ComponentType, ReactNode } from 'react';

export interface SettingsSection {
  id: string;
  label: string;
  order?: number;
  icon?: ReactNode | string;
  component: ComponentType;
}
