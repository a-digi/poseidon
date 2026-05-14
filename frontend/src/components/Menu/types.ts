export interface MenuProps {
  compact?: boolean;
}

export type MenuItem = {
  label: string;
  to?: string;
  icon?: React.ReactNode | string;
  children?: MenuItem[];
  id?: string;
};
