import React, { ReactNode } from 'react';
import { TopBarProps } from './types';
import { useTopBar } from './TopBarContext';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { NotificationMessages } from '../Notification/Messages';
import { Title } from './Title';
import MenuToggle from '../Menu/MenuToggle';

export interface TopBarChild {
  element: ReactNode;
  position: number;
}

export const TopBar: React.FC<TopBarProps & { children?: TopBarChild[] }> = ({ children }) => {
  const { components } = useTopBar();

  const allChildren: TopBarChild[] = [
    { element: <LanguageSwitcher />, position: 1 },
    { element: <NotificationMessages />, position: 2 },
    ...(children || []),
  ];

  const sortedChildren = allChildren.sort((a, b) => a.position - b.position);

  return (
    <header className="w-full h-16 flex items-center px-1 md:px-1 pr-6 md:pr-7 sticky top-0 z-50">
      <div className="flex-1 flex items-center">
        <MenuToggle />
        <Title />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {sortedChildren.map((child, idx) => (
          <React.Fragment key={idx}>{child.element}</React.Fragment>
        ))}
        {components.map((Component, idx) => (
          <React.Fragment key={'ctx-' + idx}>{Component}</React.Fragment>
        ))}
      </div>
    </header>
  );
};
