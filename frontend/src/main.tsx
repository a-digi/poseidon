import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TopBarProvider } from './components/TopBar/TopBarContext';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import { LanguageProvider } from './components/LanguageSwitcher/LanguageContext';
import { ToastProvider } from './components/Notification/ToastProvider';
import { MenuProvider } from '@/components/Menu';
import '@/lib/poseidon-bridge';

// Stellt React und ReactRouterDOM global für Plugins bereit
import * as ReactRouterDOM from 'react-router-dom';

// Typisierung für window-Erweiterung, damit TS2339 für React und ReactRouterDOM nicht auftritt
interface WindowWithReact extends Window {
  React?: typeof React;
  ReactRouterDOM?: typeof ReactRouterDOM;
}

declare let window: WindowWithReact;

window.React = React;
window.ReactRouterDOM = ReactRouterDOM;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <TopBarProvider>
          <ToastProvider>
            <MenuProvider>
              <App />
            </MenuProvider>
          </ToastProvider>
        </TopBarProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
