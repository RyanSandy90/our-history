import { useCallback, useEffect, useRef, useState, type RefObject, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import history from "../data/history.json";
import { assetUrl } from "./assets";
import { timelineEntries as entries } from "./entries";
import { PINNED_HISTORY_QUERY, timelineStop, type ScrollRuntime } from "./scroll";
import HistoryModelViewer from "./HistoryModelViewer";
import { useTimelineModels } from "./useTimelineModels";
import TimelineEntry from "./TimelineEntry";
import useReducedMotionPreference from "./useReducedMotionPreference";

export default function PinnedTimeline({ assetBase, runtime }: { assetBase: string; runtime: RefObject<ScrollRuntime | null> }) {
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const rail = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const currentIndex = useRef(0);
  const reduced = useReducedMotionPreference();
  const entry = entries[index];
  const portrait = entry.renderKind === "photo" && entry.image.height > entry.image.width * 1.1;
  const models = useTimelineModels(section, assetBase);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const element = section.current!;
    let alive = true;
    let restoreFrame = 0;
    const resize = () => element.style.setProperty("--timeline-scale", String(Math.min(element.clientWidth / 1280, window.innerHeight / 832)));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    const preferences = window.matchMedia(PINNED_HISTORY_QUERY);
    let restoring = false;
    let reading = false;
    let currentMode = preferences.matches;
    const rememberReading = () => {
      if (restoring || currentMode !== preferences.matches) return;
      const pin = trigger.current;
      reading = pin ? window.scrollY >= pin.start && window.scrollY < pin.end : Math.abs(element.getBoundingClientRect().top) < 2;
    };
    window.addEventListener("scroll", rememberReading, { passive: true });
    const updateMode = () => {
      // A newer preference/viewport change supersedes any queued restoration.
      cancelAnimationFrame(restoreFrame);
      const previous = trigger.current;
      // CSS can collapse the opening before matchMedia rebuilds its pin. Retain
      // the last settled reading state instead of measuring that transient layout.
      const wasReading = reading || (previous ? window.scrollY >= previous.start && window.scrollY < previous.end : Math.abs(element.getBoundingClientRect().top) < 2);
      currentMode = preferences.matches;
      const savedIndex = currentIndex.current;
      restoring = wasReading;
      previous?.kill();
      trigger.current = null;
      if (preferences.matches) trigger.current = ScrollTrigger.create({
        id: "aquinas-history-timeline", trigger: element, start: "top top",
        end: () => `+=${entries.length * Math.max(440, element.clientHeight * .78)}`,
        pin: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          if (restoring) return;
          currentIndex.current = Math.min(entries.length - 1, Math.floor(self.progress * entries.length));
          setIndex(currentIndex.current);
        },
      });
      // Wait for the host scroll runtime and document-height refresh before restoring.
      if (wasReading) restoreFrame = requestAnimationFrame(() => {
        if (!alive) return;
        ScrollTrigger.refresh();
        const st = trigger.current;
        runtime.current?.to(st ? timelineStop(st, savedIndex, entries.length) : element, true);
        restoring = false;
        reading = true;
        currentIndex.current = savedIndex;
        setIndex(savedIndex);
      });
    };
    updateMode();
    preferences.addEventListener("change", updateMode);
    return () => { alive = false; cancelAnimationFrame(restoreFrame); preferences.removeEventListener("change", updateMode); trigger.current?.kill(); trigger.current = null; observer.disconnect(); window.removeEventListener("resize", resize); window.removeEventListener("scroll", rememberReading); };
  }, []);

  const select = useCallback((next: number, focus = false) => {
    const bounded = Math.max(0, Math.min(entries.length - 1, next));
    currentIndex.current = bounded;
    setIndex(bounded);
    const st = trigger.current;
    if (st) {
      const target = timelineStop(st, bounded, entries.length);
      runtime.current?.to(target, true);
      ScrollTrigger.update();
    }
    if (focus) rail.current?.querySelector<HTMLButtonElement>(`[data-index="${bounded}"]`)?.focus({ preventScroll: true });
  }, [runtime]);

  const keydown = (event: KeyboardEvent<HTMLElement>) => {
    const target = Number((event.target as HTMLElement).dataset.index);
    const from = Number.isFinite(target) ? target : index;
    const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? from + 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? from - 1 : event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1 : null;
    if (next !== null) { event.preventDefault(); select(next, true); }
  };

  // Warm just the adjacent images rather than downloading the full archive again.
  useEffect(() => {
    [entries[index - 1], entries[index + 1]].filter(item => item?.renderKind === "photo").forEach(item => { const img = new Image(); img.src = assetUrl(assetBase, item.image.src); });
  }, [index, assetBase]);

  useEffect(() => {
    const element = rail.current!;
    const date = element.querySelector<HTMLElement>("[aria-current]");
    // The phone rail can be swiped independently. Keep the selected year in
    // sight without scrollIntoView moving the document or disturbing its pin.
    if (date && element.scrollWidth > element.clientWidth) {
      element.scrollTo({ left: date.offsetLeft - element.clientWidth / 2 + date.offsetWidth / 2, behavior: reduced ? "instant" : "smooth" });
    }
  }, [index, reduced]);

  return <section className="history-timeline" id="history-timeline" aria-label="Aquinas history timeline" ref={section} data-active-year={entry.date} data-models-state={models.state}>
    <a className="history-skip-link" href="#history-end" onClick={event => {
      event.preventDefault();
      // The WordPress host can have its own anchors; resolve within this experience.
      const end = section.current?.closest(".aquinas-history")?.querySelector<HTMLElement>("#history-end");
      if (!end) return;
      runtime.current?.to(end, true);
      end.focus({ preventScroll: true });
    }}>Skip timeline</a>
    <div className="history-timeline-stage">
      <div className="history-year" aria-hidden="true"><span className={entry.date.includes("–") ? "history-year-range" : undefined}>{entry.date}</span></div>
      {/* One shared entry view; selecting a year changes its data, not the page route. */}
      <AnimatePresence mode="wait" initial={false}>
        <TimelineEntry key={entry.id} entry={entry} />
      </AnimatePresence>
      <nav className="history-date-rail" aria-label="Choose a year. Use arrow keys to move through the timeline." ref={rail} onKeyDown={keydown}>
        {history.entries.map(item => {
          const i = entries.findIndex(example => example.date === item.date);
          return i < 0 ? <span className="history-date history-date-placeholder" key={item.id} aria-hidden="true"><span className="history-date-tick" /><span>{item.date}</span></span> : <button type="button" data-index={i} className={`history-date ${i === index ? "is-current" : ""}`} key={item.id} aria-current={i === index ? "step" : undefined} aria-controls="history-entry" aria-label={`${item.date}: ${item.title}`} tabIndex={i === index ? 0 : -1} onClick={() => select(i)}><span className="history-date-tick" /><span>{item.date}</span></button>;
        })}
      </nav>
      <AnimatePresence mode="wait" initial={false}>
        <motion.figure key={entry.id} className={`history-photo history-timeline-photo ${portrait ? "history-photo-portrait" : ""} ${entry.renderKind !== "photo" ? `history-render3d history-render3d-${entry.renderKind}` : ""}`} initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .24 }}>
          {entry.renderKind === "photo" ? <img src={assetUrl(assetBase, entry.image.src)} alt={entry.image.alt} width={entry.image.width} height={entry.image.height} /> : <HistoryModelViewer startModels={models.start} assetBase={assetBase} kind={entry.renderKind} poster={entry.image.src} label={entry.image.alt} />}
          <figcaption>{entry.date} {entry.image.sourceLabel}</figcaption>
        </motion.figure>
      </AnimatePresence>
      <div className="history-timeline-controls">
        <div className="history-step-buttons"><button disabled={index === 0} onClick={() => select(index - 1)} aria-label="Previous year">←</button><span>{String(index + 1).padStart(2, "0")} <span className="history-counter-divider">/</span> {entries.length}</span><button disabled={index === entries.length - 1} onClick={() => select(index + 1)} aria-label="Next year">→</button></div>
      </div>
    </div>
  </section>;
}
