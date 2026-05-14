import React, { createContext, useContext } from 'react';

// Kontext-Map: Message-Type zu Übersetzungsschlüssel und Properties
export interface MessageTypeContextValue {
  translationKey: string;
  properties: string[];
}

export const messageTypeToTranslationKey: Record<string, MessageTypeContextValue> = {
  dropboxProfileUpdated: {
    translationKey: 'dropboxProfileUpdated',
    properties: ['email'],
  },
};

export const MessageTypeContext = createContext(messageTypeToTranslationKey);

export const useMessageTypeContext = () => useContext(MessageTypeContext);

export const MessageTypeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MessageTypeContext.Provider value={messageTypeToTranslationKey}>
      {children}
    </MessageTypeContext.Provider>
  );
};
