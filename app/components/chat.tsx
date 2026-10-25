import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { chatCopy } from '../lib/chat-copy';

const ChatPanel = lazy(() => import('./chat-panel'));

/** Floating chat button. The panel bundle loads on the first tap. Not rendered on /thanh-toan*. */
export function ChatLauncher() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Sticky bars (add-to-cart, cart total, mobile bottom nav) push the button up via --sticky-bar-h.
    const measure = () => {
      const h = [...document.querySelectorAll<HTMLElement>('.sticky-action,.bottom-nav')]
        .filter(el => getComputedStyle(el).position === 'fixed' && getComputedStyle(el).display !== 'none' && el.getClientRects().length)
        .reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
      document.body.style.setProperty('--sticky-bar-h', `${Math.round(h)}px`);
    };
    measure();
    const timer = setTimeout(measure, 400);
    addEventListener('resize', measure);
    return () => { clearTimeout(timer); removeEventListener('resize', measure); };
  }, [pathname]);
  if (pathname.startsWith('/thanh-toan')) return null;
  const close = () => { setOpen(false); requestAnimationFrame(() => fab.current?.focus()); };
  return <>
    <button ref={fab} type="button" className={`chat-fab${open ? ' is-hidden' : ''}`} aria-label={chatCopy.fab_aria} aria-haspopup="dialog" aria-expanded={open} aria-controls="chat-panel" onClick={() => { setLoaded(true); setOpen(true); }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth="2.6"/></svg>
    </button>
    {loaded && <Suspense fallback={null}><ChatPanel open={open} onClose={close}/></Suspense>}
  </>;
}
