import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export interface LenisLike {
  scrollTo(target: number | string | HTMLElement, options?: { immediate?: boolean; duration?: number; easing?: (value: number) => number; offset?: number; onComplete?: () => void }): void;
  on?(event: string, callback: () => void): unknown;
  off?(event: string, callback: () => void): unknown;
  resize?(): void;
  readonly targetScroll?: number;
  readonly options?: { wheelMultiplier?: number };
}

export const SCROLL_SENSITIVITY = 1.3;
export const OPENING_TRAVEL_SECONDS = 1.65;
export const CHAPTER_TRAVEL_SECONDS = 1.1;
// Phones share the reading stops; short landscape screens and reduced motion
// use document flow so browser chrome cannot squeeze a pinned card out of view.
export const PINNED_HISTORY_QUERY = "(min-height: 500px) and (prefers-reduced-motion: no-preference)";

// Rest in the centre of each year so forward and reverse changes occur halfway.
export const timelineStop = (pin: { start: number; end: number }, index: number, count: number) =>
  pin.start + (pin.end - pin.start) * (index + .5) / count;

// Zero velocity and acceleration at either end, without the default exponential jump.
const readingEase = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export function createScrollRuntime(host?: LenisLike) {
  gsap.registerPlugin(ScrollTrigger);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const owned = !host && !reduced ? new Lenis({ lerp: .085, wheelMultiplier: SCROLL_SENSITIVITY, smoothWheel: true, syncTouch: false }) : null;
  const lenis = host ?? owned;
  const update = () => ScrollTrigger.update();
  // Keep Lenis on GSAP's frame loop without inheriting its lag-adjusted clock or
  // changing the host site's global GSAP ticker settings.
  const tick = () => owned?.raf(performance.now());
  lenis?.on?.("scroll", update);
  if (owned) gsap.ticker.add(tick, false, true);
  return {
    projectWheel(delta: number) {
      return (lenis?.targetScroll ?? window.scrollY) + delta * (lenis?.options?.wheelMultiplier ?? 1);
    },
    to(target: number | HTMLElement, immediate = false, onComplete?: () => void, duration = CHAPTER_TRAVEL_SECONDS) {
      // Pins can change the document height before Lenis's debounced resize runs.
      lenis?.resize?.();
      if (lenis) lenis.scrollTo(target, { immediate: immediate || reduced, duration, easing: readingEase, onComplete });
      else {
        window.scrollTo({ top: typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
        onComplete?.();
      }
    },
    destroy() {
      lenis?.off?.("scroll", update);
      if (owned) { gsap.ticker.remove(tick); owned.destroy(); }
    },
  };
}

export type ScrollRuntime = ReturnType<typeof createScrollRuntime>;
