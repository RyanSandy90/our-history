import { useLayoutEffect, useRef } from "react";
import { motion } from "motion/react";
import type { timelineEntries } from "./entries";
import StaggeredWords from "./StaggeredWords";
import useTextStagger from "./useTextStagger";
import useReducedMotionPreference from "./useReducedMotionPreference";

export default function TimelineEntry({ entry }: { entry: typeof timelineEntries[number] }) {
  const article = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPreference();
  const complete = useTextStagger(article);
  useLayoutEffect(() => {
    const element = copy.current;
    if (!element) return;
    const reading = element.parentElement!;
    const update = () => {
      const height = element.clientHeight;
      const range = element.scrollHeight - height;
      const overflows = complete && range > 1;
      const thumb = Math.min(height, Math.max(24, height * height / Math.max(1, element.scrollHeight)));
      reading.dataset.overflow = String(overflows);
      reading.style.setProperty("--copy-thumb-height", `${thumb}px`);
      reading.style.setProperty("--copy-thumb-offset", `${range > 0 ? Math.max(0, Math.min(1, element.scrollTop / range)) * (height - thumb) : 0}px`);
      element.tabIndex = overflows ? 0 : -1;
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    Array.from(element.children).forEach(child => observer.observe(child));
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [complete]);
  return <motion.article ref={article} className="history-entry" id="history-entry" data-text-reveal={complete ? "complete" : "running"} aria-labelledby={`entry-${entry.id}`} initial={false} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .16 }}>
    <h2 id={`entry-${entry.id}`} data-text-stagger><span className="history-sr-only">{entry.date}: </span><StaggeredWords text={entry.title} preventOrphans /></h2>
    <div className="history-entry-reading">
      <div ref={copy} className="history-entry-copy" role="region" aria-label={`${entry.date}: ${entry.title}, story text`} data-lenis-prevent data-text-stagger>{entry.paragraphs.map(paragraph => <p key={paragraph}><StaggeredWords text={paragraph} /></p>)}</div>
      <span className="history-copy-scrollbar" aria-hidden="true"><span /></span>
    </div>
  </motion.article>;
}
