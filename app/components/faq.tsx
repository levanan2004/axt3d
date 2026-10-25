import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '../lib/copy';

/** Accordion: one item open at a time, all closed on load. */
export function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const id = useId();
  if (!items.length) return null;
  return <section className="faq-section" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{title}</h2>
    <div className="faq-list">{items.map((item, i) => {
      const isOpen = open === i;
      return <div className={`faq-item${isOpen ? ' is-open' : ''}`} key={item.q}>
        <h3><button type="button" className="faq-q" id={`${id}-q${i}`} aria-expanded={isOpen} aria-controls={`${id}-a${i}`} onClick={() => setOpen(isOpen ? null : i)}>
          <span>{item.q}</span><ChevronDown className="faq-chevron" size={20} aria-hidden="true"/>
        </button></h3>
        <div className="faq-a" id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} hidden={!isOpen}><p>{item.a}</p></div>
      </div>;
    })}</div>
  </section>;
}
export function faqJsonLd(items: FaqItem[]) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(i => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })) };
}
