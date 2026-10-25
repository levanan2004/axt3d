import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { chatCopy, contactReady, retryCountdown } from '../lib/chat-copy';
import { shopConfig } from '../lib/config';

const MAX = shopConfig.chatbot.maxInputChars;
const COUNTER_AT = MAX - 50;
const STORE = 'axt3d.chat';
const zaloHref = chatCopy.zalo_href, callHref = chatCopy.call_href;
type Msg = { role: 'user' | 'model'; text: string } | { role: 'fallback' } | { role: 'error'; retry: string };
type Notice = { text: string; until?: number } | null;

/** Empty, named slot for a mascot image (bot_avatar, bot_chao, bot_khong_biet). Drop a file path into config.chatbot.mascots to show it. */
function Mascot({ name, size }: { name: 'bot_avatar' | 'bot_chao' | 'bot_khong_biet'; size: number }) {
  const src = (shopConfig.chatbot.mascots as Record<string, string>)[name];
  return src ? <img className="bot-mascot has-img" src={src} width={size} height={size} alt="" data-mascot={name}/>
    : <span className="bot-mascot" data-mascot={name} style={{ width: size, height: size }} aria-hidden="true"/>;
}

function FallbackCard() {
  return <div className="chat-row bot"><div className="chat-fallback">
    <Mascot name="bot_khong_biet" size={56}/>
    <p>{chatCopy.fallback_reply}</p>
    {contactReady ? <div className="chat-fallback-actions">
      <a className="chat-btn zalo" href={zaloHref} target="_blank" rel="noopener noreferrer">{chatCopy.btn_zalo}</a>
      <a className="chat-btn call" href={callHref}>{chatCopy.btn_call}</a>
    </div> : null}
  </div></div>;
}

export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>(() => { try { return JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch { return []; } });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [now, setNow] = useState(Date.now());
  const panel = useRef<HTMLDivElement>(null), log = useRef<HTMLDivElement>(null), field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-30))); } catch { /* private mode */ } }, [messages]);
  useLayoutEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, busy]);
  useEffect(() => {
    if (!notice?.until) return;
    const t = setInterval(() => { setNow(Date.now()); if (Date.now() >= notice.until!) setNotice(null); }, 1000);
    return () => clearInterval(t);
  }, [notice]);
  useEffect(() => {
    if (!open) return;
    const mobile = matchMedia('(max-width: 767px)').matches;
    // Mobile: focus the close button so the keyboard does not pop up straight away.
    (mobile ? panel.current?.querySelector<HTMLElement>('.chat-close') : field.current)?.focus();
    const root = document.documentElement, prev = root.style.overflow;
    if (mobile) root.style.overflow = 'hidden';
    const vv = window.visualViewport;
    const kb = () => vv && panel.current?.style.setProperty('--kb', `${Math.max(0, innerHeight - vv.height - vv.offsetTop)}px`);
    vv?.addEventListener('resize', kb); vv?.addEventListener('scroll', kb);
    return () => { root.style.overflow = prev; vv?.removeEventListener('resize', kb); vv?.removeEventListener('scroll', kb); };
  }, [open]);
  useLayoutEffect(() => {
    const el = field.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],textarea:not([disabled])')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy || (notice?.until && notice.until > Date.now())) return;
    if (message.length > MAX) { setNotice({ text: chatCopy.too_long }); return; }
    const history = messages.flatMap(m => m.role === 'user' || m.role === 'model' ? [m] : []);
    setMessages(m => [...m.filter(x => x.role !== 'error'), { role: 'user', text: message }]);
    setInput(''); setBusy(true); setNotice(null);
    const fail = () => setMessages(m => [...m, { role: 'error', retry: message }]);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, history }), signal: AbortSignal.timeout(20000) });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({})) as { reason?: string };
        const wait = Number(res.headers.get('Retry-After') || 30);
        setMessages(m => m.slice(0, -1)); setInput(message);
        if (data.reason === 'daily') setNotice({ text: chatCopy.quota_daily });
        else if (data.reason === 'shop') setNotice({ text: chatCopy.quota_shop });
        else { setNow(Date.now()); setNotice({ text: chatCopy.rate_limit, until: Date.now() + wait * 1000 }); }
        if (data.reason === 'daily' || data.reason === 'shop') setMessages(m => [...m, { role: 'fallback' }]);
        return;
      }
      if (res.status === 400) { const d = await res.json().catch(() => ({})) as { error?: string }; if (d.error === 'too_long') { setNotice({ text: chatCopy.too_long }); setMessages(m => m.slice(0, -1)); setInput(message); return; } }
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('application/json')) {
        const d = await res.json() as { fallback?: boolean };
        if (d.fallback) setMessages(m => [...m, { role: 'fallback' }]); else fail();
        return;
      }
      if (!res.ok || !res.body) { fail(); return; }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = '', started = false, ended = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += value;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i).replace(/^data:\s*/, ''); buf = buf.slice(i + 2);
          if (!line) continue;
          const ev = JSON.parse(line) as { t?: string; fallback?: boolean; done?: boolean; error?: string };
          if (ev.t) {
            if (!started) { started = true; setBusy(false); setMessages(m => [...m, { role: 'model', text: ev.t! }]); }
            else setMessages(m => { const c = [...m]; const l = c[c.length - 1]; if (l.role === 'model') c[c.length - 1] = { ...l, text: l.text + ev.t }; return c; });
          } else if (ev.fallback) { ended = true; setMessages(m => [...m.filter((x, k) => !(started && k === m.length - 1 && x.role === 'model')), { role: 'fallback' }]); }
          else if (ev.error) { ended = true; if (!started) fail(); }
          else if (ev.done) ended = true;
        }
      }
      if (!ended && !started) fail();
    } catch { fail(); }
    finally { setBusy(false); }
  }

  const waiting = notice?.until && notice.until > now ? Math.ceil((notice.until - now) / 1000) : 0;
  return <>
    <div className={`chat-overlay${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true"/>
    <div ref={panel} id="chat-panel" className={`chat-panel${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="chat-title" aria-describedby="chat-note" inert={!open} onKeyDown={onKey}>
      <div className="chat-grabber" aria-hidden="true"/>
      <header className="chat-head">
        <Mascot name="bot_avatar" size={32}/>
        <div className="chat-head-text"><h2 id="chat-title">{chatCopy.header_title}</h2><p id="chat-note">{chatCopy.header_note}</p></div>
        <button type="button" className="chat-close" aria-label={chatCopy.close_aria} onClick={onClose}><X size={22} aria-hidden="true"/></button>
      </header>
      <div ref={log} className="chat-log" role="log" aria-live="polite" aria-relevant="additions">
        <div className="chat-welcome"><Mascot name="bot_chao" size={96}/><p className="chat-disclaimer">{chatCopy.disclaimer}</p></div>
        <div className="chat-row bot"><div className="chat-bubble bot">{chatCopy.greeting}</div></div>
        {messages.length === 0 && <div className="chat-chips" role="group" aria-label={chatCopy.chips_group_aria}>
          {[chatCopy.chip_1, chatCopy.chip_2, chatCopy.chip_3].map(c => <button key={c} type="button" className="chat-chip" onClick={() => send(c)}>{c}</button>)}
        </div>}
        {messages.map((m, i) => m.role === 'fallback' ? <FallbackCard key={i}/>
          : m.role === 'error' ? <div key={i} className="chat-row bot"><div className="chat-error" role="alert">{chatCopy.error_send} <button type="button" className="chat-retry" onClick={() => { setMessages(x => x.slice(0, -2)); send(m.retry); }}>{chatCopy.error_retry}</button></div></div>
          : <div key={i} className={`chat-row ${m.role === 'user' ? 'user' : 'bot'}`}><div className={`chat-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>{m.text}</div></div>)}
        {busy && <div className="chat-row bot"><div className="chat-bubble bot chat-typing" role="status" aria-label={chatCopy.typing_aria}><i/><i/><i/></div></div>}
      </div>
      {notice && <div className="chat-warn" role="status">{notice.text}{waiting ? ` ${retryCountdown(waiting)}` : ''}</div>}
      <form className="chat-input" onSubmit={e => { e.preventDefault(); send(input); }}>
        {input.length >= COUNTER_AT && <span className="chat-counter" aria-live="polite">{input.length}/{MAX}</span>}
        <textarea ref={field} rows={1} value={input} maxLength={MAX} placeholder={chatCopy.input_placeholder} aria-label={chatCopy.input_aria}
          onChange={e => setInput(e.target.value.slice(0, MAX))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}/>
        <button type="submit" className="chat-send" aria-label={chatCopy.send_aria} disabled={!input.trim() || busy || waiting > 0}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </form>
    </div>
  </>;
}
