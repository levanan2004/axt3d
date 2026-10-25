import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { chatCopy } from '../lib/chat-copy';
import { Mascot } from './mascot';

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
      <Mascot name="bot_avatar" size={32}/>
    </button>
    {loaded && <Suspense fallback={null}><ChatPanel open={open} onClose={close}/></Suspense>}
  </>;
}
