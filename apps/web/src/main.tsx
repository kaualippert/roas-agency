import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import AuthGate from './AuthGate';
import {applyThemePreference,normalizeThemePreference} from './appearance-theme';
import './styles.css';
import './auth.css';
import './design-system.css';
import './dark-theme.css';
import './readability.css';
import './mobile.css';
import './appearance-themes.css';
import './agency-branding.css';
import './sidebar-preference.css';

applyThemePreference(normalizeThemePreference(localStorage.getItem('roas_theme')));

createRoot(document.getElementById('root')!).render(
 <React.StrictMode>
  <BrowserRouter><AuthGate><App/></AuthGate></BrowserRouter>
 </React.StrictMode>,
);
