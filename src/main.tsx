import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/plus-jakarta-sans';
import './styles/global.css';
import { App } from './App';
import { AuthProvider } from './lib/auth';
import { SiteConfigProvider } from './lib/siteConfig';
import { StudyProvider } from './lib/study';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteConfigProvider>
        <AuthProvider>
          <StudyProvider>
            <App />
          </StudyProvider>
        </AuthProvider>
      </SiteConfigProvider>
    </BrowserRouter>
  </StrictMode>,
);
