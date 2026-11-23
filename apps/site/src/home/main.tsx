import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Footer, TopBar } from '../ui/Chrome';
import { Hero } from './Hero';
import { InContext } from './InContext';
import { States } from './States';
import '../styles/base.css';
import '../styles/home.css';

/** Sections fade in once as they are reached (not with reduced motion). */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.section');
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Home() {
  useReveal();
  return (
    <>
      <TopBar page="home" />
      <main id="main" tabIndex={-1}>
        <Hero />
        <States />
        <InContext />
        {/* M9: <Playground /> · M10: <Install /> */}
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Home /></StrictMode>);
