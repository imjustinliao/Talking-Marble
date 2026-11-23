import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Docs } from '../components/Docs';
import { Footer, TopBar } from '../ui/Chrome';
import '../ui/pointerLight';
import '../styles/base.css';
import '../styles/docs.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The same stage as the home page, held still: black, a horizon glow, grain */}
    <div className="docs-stage" aria-hidden="true" />
    <div className="grain" aria-hidden="true" />
    <TopBar page="docs" />
    <main id="main" tabIndex={-1}>
      <Docs />
    </main>
    <Footer />
  </StrictMode>,
);
