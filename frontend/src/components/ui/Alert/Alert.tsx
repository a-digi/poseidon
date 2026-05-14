import React from 'react';

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'marketplace';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  title?: string;
  message: string;
  icon?: React.ReactNode;
}

const ALERT_STYLES: Record<AlertType, string> = {
  info: 'bg-blue-50 border-blue-300 text-blue-800',
  success: 'bg-green-50 border-green-400 text-green-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-900',
  error: 'bg-red-50 border-red-400 text-red-800',
  neutral: 'bg-gray-50 border-gray-300 text-gray-800',
  marketplace: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 border-transparent text-white shadow-lg',
};

const ICONS: Record<AlertType, React.ReactNode> = {
  info: (
    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
    </svg>
  ),
  neutral: (
    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  marketplace: (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" />
    </svg>
  ),
};

const Alert: React.FC<AlertProps> = ({ type = 'info', title, message, icon, className = '', ...props }) => {
  return (
    <div
      className={`flex items-start gap-3 border-l-4 rounded p-4 shadow-sm ${ALERT_STYLES[type]} ${className}`.trim()}
      role="alert"
      {...props}
    >
      <div className="pt-0.5">{icon ?? ICONS[type]}</div>
      <div className="flex-1">
        {title && <div className="font-semibold text-base mb-1">{title}</div>}
        <div className="text-sm leading-relaxed">{message}</div>
      </div>
    </div>
  );
};

export default Alert;
