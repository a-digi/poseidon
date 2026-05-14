import React from 'react';
import { ContentAreaProps } from './types';

export const ContentArea: React.FC<ContentAreaProps> = ({ children }) => (
  <section className="w-full h-full flex flex-col">
    <div className="w-full h-full">
      {children ? (
        children
      ) : (
        <div className="text-gray-500 text-center text-lg">Welcome to the content area.</div>
      )}
    </div>
  </section>
);
