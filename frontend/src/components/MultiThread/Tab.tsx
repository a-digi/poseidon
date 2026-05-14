import { useRef, useState } from 'react';
import type { Tab } from './types';

interface TabProps {
  tab: Tab;
  displayTitle: string;
  isActive: boolean;
  isDragging: boolean;
  showDropIndicator: boolean;
  onSwitch: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onRename: (tabId: string, title: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function Tab({ tab, displayTitle, isActive, isDragging, showDropIndicator, onSwitch, onClose, onRename, onDragStart, onDragOver, onDrop, onDragEnd }: TabProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeStyles = isActive
    ? 'bg-white font-medium text-gray-900 border-t-2 border-t-blue-500'
    : 'bg-gray-50 text-gray-600 hover:bg-gray-100';

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(tab.id, trimmed);
    else setDraft(displayTitle);
    setEditing(false);
  };

  const startEditing = () => {
    setDraft(displayTitle);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <div
      draggable
      className={`flex items-center gap-1 px-3 h-full text-sm border-r border-gray-200 cursor-pointer shrink-0 transition-opacity select-none
        ${activeStyles}
        ${isDragging ? 'opacity-40' : ''}
        ${showDropIndicator ? 'border-l-2 border-l-blue-500' : ''}`}
      onClick={() => !editing && onSwitch(tab.id)}
      onDoubleClick={startEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setDraft(displayTitle); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-24 text-sm bg-white border border-blue-400 rounded px-1 outline-none"
          autoFocus
        />
      ) : (
        <span className="max-w-32 truncate">{displayTitle}</span>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
        className="ml-1 text-gray-400 hover:text-gray-700 rounded-sm leading-none"
        aria-label="Close tab"
      >
        ×
      </button>
    </div>
  );
}
