import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Docs } from '../components/Docs';
import { Footer, TopBar } from '../ui/Chrome';
import { Backdrop } from './Backdrop';
import '../styles/base.css';
import '../styles/docs.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Backdrop />
    <TopBar page="docs" />
    <main id="main" tabIndex={-1}>
      <Docs />
    </main>
    <Footer />
  </StrictMode>,
);
