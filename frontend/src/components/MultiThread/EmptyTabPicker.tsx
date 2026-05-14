export function EmptyTabPicker() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className="w-20 h-20 mb-4"
      >
        <rect x="8" y="12" width="48" height="34" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <path d="M20 46 L16 52 H48 L44 46" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="22" y1="52" x2="42" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="29" r="6" stroke="currentColor" strokeWidth="2.5" />
        <line x1="32" y1="23" x2="32" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="37" x2="32" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="29" x2="24" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="29" x2="38" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-lg font-medium text-gray-400">Nothing running here yet</p>
      <p className="text-sm text-gray-300 mt-1">Open a plugin from the sidebar</p>
    </div>
  );
}
