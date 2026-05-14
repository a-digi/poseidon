import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessageTypeContext } from './MessageTypeContext';

interface Message {
  type: string;
  payload: any;
  read?: boolean;
}

const eventTypes = ['dropboxProfileUpdated'];

export function NotificationMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const messageTypeMap = useMessageTypeContext();

  useEffect(() => {
    if (open) {
      setMessages((prev) => prev.map((msg) => ({ ...msg, read: true })));
    }
  }, [open]);

  useEffect(() => {
    eventTypes.forEach((eventType) => {
      const handler = (payload: any) => {
        setMessages((prev) => [{ type: eventType, payload, read: false }, ...prev]);
      };
      if (window.runtime && window.runtime.EventsOn) {
        window.runtime.EventsOn(eventType, handler);
      }
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function createTranslatedMessage(
    msg: Message,
    t: (key: string, options?: Record<string, any>) => string,
    messageTypeMap: Record<string, { translationKey: string; properties: string[] }>
  ) {
    const typeConfig = messageTypeMap[msg.type];
    const translationKey = typeConfig?.translationKey || msg.type;
    const properties = typeConfig?.properties || [];
    const translationParams: Record<string, string> = {};

    // Robust: Nur wenn payload ein Objekt ist
    if (msg.payload && typeof msg.payload === 'object' && !Array.isArray(msg.payload)) {
      properties.forEach((prop) => {
        translationParams[prop] = msg.payload[prop] !== undefined ? String(msg.payload[prop]) : '-';
      });
    } else {
      properties.forEach((prop) => {
        translationParams[prop] = '-';
      });
    }

    return <>{t(translationKey, translationParams)}</>;
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="w-8 h-8 flex items-center justify-center text-xl bg-white rounded-md border border-blue-300 shadow hover:bg-blue-100 transition-colors relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Benachrichtigungen anzeigen"
      >
        <svg
          className="w-6 h-6 text-blue-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {messages.filter((msg) => !msg.read).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
            {messages.filter((msg) => !msg.read).length}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 bg-white rounded shadow-lg border border-blue-200 z-50 flex flex-col min-w-[320px] max-w-[400px] max-h-96 overflow-y-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {messages.length === 0 ? (
            <div className="p-4 text-gray-500 text-base">Keine Benachrichtigungen</div>
          ) : (
            messages.map((msg: Message, idx) => (
              <button
                key={idx}
                type="button"
                className={`notification-message text-left w-full p-5 border-b last:border-b-0 transition-colors text-base ${!msg.read ? 'bg-blue-50' : ''} hover:bg-blue-100 focus:bg-blue-200`}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {createTranslatedMessage(msg, t, messageTypeMap)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
