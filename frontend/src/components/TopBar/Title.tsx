import React from 'react';
import { useTopBar } from './TopBarContext';

interface TitleObject {
  text: string;
  icon?: React.ReactNode;
}

function isTitleObject(title: unknown): title is TitleObject {
  return (
    !!title &&
    typeof title === 'object' &&
    'text' in title &&
    typeof (title as any).text === 'string'
  );
}

export const Title: React.FC = () => {
  const { title } = useTopBar();
  if (!title) return null;

  if (typeof title === 'string') {
    return (
      <span className="font-bold text-lg text-gray-900 truncate" data-testid="topbar-title">
        {title}
      </span>
    );
  }

  if (isTitleObject(title)) {
    return (
      <span
        className="flex items-center font-bold text-lg text-gray-900 truncate"
        data-testid="topbar-title"
      >
        {title.icon && <span className="mr-2 flex-shrink-0">{title.icon}</span>}
        {title.text}
      </span>
    );
  }

  return <>{title}</>;
};
