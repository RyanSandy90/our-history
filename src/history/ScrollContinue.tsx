import { useEffect, useState, type RefObject } from "react";
import history from "../data/history.json";
import useReducedMotionPreference from "./useReducedMotionPreference";
import { openingStops } from "./useOpeningJourney";

// Start the reading allowance after the text and red highlights have settled.
const readingTimes = history.introFrames.map(copy => Math.max(3000, copy.trim().split(/\s+/).length / 220 * 60000));

interface ScrollContinueProps {
  root: RefObject<HTMLElement | null>;
  enabled: boolean;
  heroReady: boolean;
  reading: { frame: number; ready: boolean };
  suspended: boolean;
  onContinue: (keyboard: boolean) => void;
}

/** One prompt across the opening pin, removed when the timeline reaches the top. */
export default function ScrollContinue({ root, enabled, heroReady, reading, suspended, onContinue }: ScrollContinueProps) {
  const reduced = useReducedMotionPreference();
  const [position, setPosition] = useState({ visible: false, frame: 0, pinned: false, transitioning: false });
  const [phase, setPhase] = useState<"waiting" | "shimmer" | "complete">("waiting");

  useEffect(() => {
    if (!enabled || !root.current) return;
    const opening = root.current.querySelector<HTMLElement>(".history-opening")!;
    const timeline = root.current.querySelector<HTMLElement>(".history-timeline")!;
    const panels = Array.from(opening.querySelectorAll<HTMLElement>(".history-intro-panel"));
    let raf = 0;
    let quietTimer = 0;
    let scrolling = false;
    const update = () => {
      const bounds = opening.getBoundingClientRect();
      const visible = bounds.top <= 1 && bounds.bottom > 0 && timeline.getBoundingClientRect().top > 1;
      const pinned = opening.hasAttribute("data-active-frame");
      const stops = pinned ? openingStops(root.current!) : null;
      const transitioning = stops
        ? root.current!.hasAttribute("data-scroll-locked") || !stops.some(stop => Math.abs(window.scrollY - stop) <= 3)
        : scrolling;
      let frame = reading.frame;
      // Without a pin, use the card at the viewport's reading centre.
      if (!pinned) {
        frame = 0;
        panels.forEach((panel, index) => {
          if (panel.getBoundingClientRect().top <= window.innerHeight / 2) frame = index + 1;
        });
      }
      setPosition(current => current.visible === visible && current.frame === frame && current.pinned === pinned && current.transitioning === transitioning ? current : { visible, frame, pinned, transitioning });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const scroll = () => {
      scrolling = true;
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => { scrolling = false; schedule(); }, 160);
      schedule();
    };
    // Wheel/swipe travel locks immediately; button travel is detected by its
    // position between stops. Both retain the same element for a smooth fade.
    const observer = new MutationObserver(schedule);
    observer.observe(root.current, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(quietTimer);
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled, root, reading.frame, reduced]);

  const visible = enabled && position.visible && !suspended;
  const resting = visible && !position.transitioning;
  const readable = position.frame === 0 ? heroReady : !position.pinned || reading.frame === position.frame && reading.ready;
  useEffect(() => {
    setPhase("waiting");
    if (!resting || !readable || reduced) return;
    const delay = position.frame === 0 ? 1000 : readingTimes[position.frame - 1];
    const timer = window.setTimeout(() => setPhase("shimmer"), delay);
    // Leaving a card, entering the timeline or opening the apology cancels its cue.
    return () => window.clearTimeout(timer);
  }, [resting, readable, position.frame, reduced]);

  if (!visible) return null;
  return <button type="button" className="history-scroll-continue" data-frame={position.frame} data-phase={phase} data-readable={readable} data-transitioning={position.transitioning} aria-disabled={position.transitioning} tabIndex={position.transitioning ? -1 : 0} onClick={event => { if (resting) onContinue(event.detail === 0); }} onAnimationEnd={() => setPhase("complete")}>
    <span className="history-scroll-label history-scroll-desktop">Scroll to continue<span aria-hidden="true">Scroll to continue</span></span>
    <span className="history-scroll-label history-scroll-mobile">Swipe to continue<span aria-hidden="true">Swipe to continue</span></span>
  </button>;
}
