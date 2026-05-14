import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface MultiSelectDropdownItem {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  items: MultiSelectDropdownItem[];
  selected: string[];
  onChange: (selected: string[]) => void;
  emptyText?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  items,
  selected,
  onChange,
  emptyText = 'No options',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const labelMap = useMemo(
    () => new Map(items.map((i) => [i.value, i.label])),
    [items],
  );

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };

  const triggerLabel = selected.length > 0 ? `${label} (${selected.length})` : label;

  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} className="relative inline-block self-start">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border rounded-md hover:bg-slate-50 transition-colors ${
            selected.length > 0
              ? 'border-blue-400 text-blue-700 font-medium'
              : 'border-slate-300 text-slate-700'
          }`}
        >
          <span>{triggerLabel}</span>
          <svg
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-auto">
            {items.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">{emptyText}</div>
            ) : (
              <ul className="py-1">
                {items.map((item) => {
                  const isSelected = selected.includes(item.value);
                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        onClick={() => toggle(item.value)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50 text-left"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-4 h-4 accent-blue-600 pointer-events-none"
                        />
                        <span className="text-slate-700 truncate">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium"
            >
              {labelMap.get(value) ?? value}
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label="Remove"
                className="text-blue-500 hover:text-blue-900 hover:bg-blue-200 rounded-full p-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
