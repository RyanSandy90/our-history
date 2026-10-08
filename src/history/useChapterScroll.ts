import { useCallback, useEffect, useRef, type RefObject } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCROLL_SENSITIVITY, OPENING_TRAVEL_SECONDS, CHAPTER_TRAVEL_SECONDS, PINNED_HISTORY_QUERY, timelineStop, type ScrollRuntime } from "./scroll";
import { openingStops } from "./useOpeningJourney";

const QUIET_MS = 220;
const POSITION_TOLERANCE = 3;
const NAVIGATION = ".history-date-rail, .history-step-buttons, .history-hero-actions, .history-end, .history-skip-link";

function destination(root: HTMLElement, direction: number, projected = window.scrollY) {
  const hero = root.querySelector<HTMLElement>(".history-hero")!;
  const timeline = root.querySelector<HTMLElement>(".history-timeline")!;
  const end = root.querySelector<HTMLElement>(".history-end")!;
  const pin = ScrollTrigger.getAll().find(item => item.trigger === timeline);
  if (!pin) return null;
  const y = window.scrollY;
  const heroTop = hero.getBoundingClientRect().top + y;
  const stops = openingStops(root);
  if (!stops) return null;
  const dates = timeline.querySelectorAll<HTMLButtonElement>(".history-date-rail button");
  const yearPosition = (index: number) => timelineStop(pin, index, dates.length);

  if (y < heroTop - POSITION_TOLERANCE) return direction > 0 ? heroTop : null;
  if (y < pin.start - POSITION_TOLERANCE) return direction > 0
    ? stops.find(stop => stop > y + POSITION_TOLERANCE) ?? pin.start
    : [...stops].reverse().find(stop => stop < y - POSITION_TOLERANCE) ?? null;
  if (y >= pin.end - POSITION_TOLERANCE) {
    // Let both footer sections scroll normally; re-enter the years only at their top.
    const endTop = end.getBoundingClientRect().top + y;
    if (direction >= 0) return null;
    if (y <= endTop + POSITION_TOLERANCE) return yearPosition(dates.length - 1);
    // Catch the projected Lenis destination before footer inertia crosses into
    // the pin. The next gesture re-enters the final year, never an earlier one.
    return projected <= endTop + POSITION_TOLERANCE ? endTop : null;
  }

  const current = Number(timeline.querySelector<HTMLElement>("[aria-current]")?.dataset.index ?? 0);
  const next = current + direction;
  if (next < 0) return stops[3];
  if (next >= dates.length) return end.getBoundingClientRect().top + y;
  return yearPosition(next);
}

function canScrollInside(target: Element, root: HTMLElement, delta: number) {
  for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (!/(auto|scroll)/.test(style.overflowY) || node.scrollHeight <= node.clientHeight + 1) continue;
    if (delta > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 1) return true;
  }
  return false;
}

/** One complete gesture per frame/year; trailing trackpad momentum cannot skip stops. */
export default function useChapterScroll(root: RefObject<HTMLElement | null>, runtime: RefObject<ScrollRuntime | null>, enabled: boolean) {
  const continueRef = useRef<(keyboard: boolean) => void>(() => {});
  useEffect(() => {
    if (!enabled || !root.current) return;
    const element = root.current;
    const mode = window.matchMedia(PINNED_HISTORY_QUERY);
    let moving = false;
    let consumed = false;
    let quiet = true;
    let accumulated = 0;
    let quietTimer = 0;
    let movementTimer = 0;
    let generation = 0;
    let touch: { x: number; y: number; target: Element } | null = null;

    const reset = () => {
      generation++;
      moving = consumed = false;
      quiet = true;
      accumulated = 0;
      touch = null;
      window.clearTimeout(quietTimer);
      window.clearTimeout(movementTimer);
      delete element.dataset.scrollLocked;
    };
    const markInput = () => {
      quiet = false;
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        quiet = true;
        accumulated = 0;
        if (!moving) consumed = false;
      }, QUIET_MS);
    };
    const prevent = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const allowed = (target: Element, touchInput = false) => mode.matches && !element.querySelector("dialog[open]") && !target.closest("input, textarea, select, [contenteditable=true]") &&
      (touchInput && element.clientWidth < 900 || !target.closest(".history-model-viewer[data-model-state=ready][data-model-interactive=true]"));
    const travel = (target: number, onComplete?: () => void) => {
      const scroll = runtime.current;
      if (!scroll) return;
      moving = consumed = true;
      accumulated = 0;
      element.dataset.scrollLocked = "true";
      const request = ++generation;
      const complete = () => {
        if (request !== generation || !moving) return;
        window.clearTimeout(movementTimer);
        moving = false;
        if (quiet) consumed = false;
        delete element.dataset.scrollLocked;
        onComplete?.();
      };
      // Also release if a host navigation interrupts Lenis and cancels its callback.
      const stops = openingStops(element);
      const duration = stops && target <= stops[3] && window.scrollY <= stops[3] + 3 ? OPENING_TRAVEL_SECONDS : CHAPTER_TRAVEL_SECONDS;
      movementTimer = window.setTimeout(complete, duration * 1000 + 700);
      scroll.to(target, false, complete, duration);
    };
    // The continue pill shares the gesture lock, stops and Lenis easing.
    continueRef.current = keyboard => {
      if (moving || element.querySelector("dialog[open]")) return;
      const timeline = element.querySelector<HTMLElement>(".history-timeline")!;
      const next = mode.matches ? destination(element, 1) :
        Array.from(element.querySelectorAll<HTMLElement>(".history-intro-panel, .history-timeline"))
          .map(panel => panel.getBoundingClientRect().top + window.scrollY)
          .find(top => top > window.scrollY + POSITION_TOLERANCE) ?? null;
      if (next === null) return;
      const previousFocus = document.activeElement;
      travel(next, () => {
        // Keep focus on the pill between cards, then hand it to the timeline
        // when the pill disappears. Do not steal focus from another control.
        if (keyboard && Math.abs(timeline.getBoundingClientRect().top) <= POSITION_TOLERANCE &&
          (document.activeElement === previousFocus || document.activeElement === document.body)) {
          timeline.querySelector<HTMLButtonElement>(".history-date-rail button[aria-current]")?.focus({ preventScroll: true });
        }
      });
    };
    const wheel = (event: WheelEvent) => {
      const target = event.target instanceof Element ? event.target : element;
      if (!allowed(target) || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      markInput();
      if (!moving && canScrollInside(target, element, delta)) { consumed = true; return; }
      if (moving || consumed) { prevent(event); return; }
      const next = destination(element, Math.sign(delta), runtime.current?.projectWheel(delta));
      if (next === null) return;
      prevent(event);
      accumulated = Math.sign(accumulated) === Math.sign(delta) ? accumulated + delta : delta;
      if (Math.abs(accumulated) * SCROLL_SENSITIVITY >= 24) travel(next);
    };
    const keydown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : document.body;
      if (!allowed(target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (target.closest("button, a, [role=button]")) {
        if (target.closest(NAVIGATION)) reset();
        return;
      }
      if (target !== document.body && !element.contains(target)) return;
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      const direction = ["ArrowDown", "PageDown"].includes(event.key) || event.key === " " && !event.shiftKey ? 1 : ["ArrowUp", "PageUp"].includes(event.key) || event.key === " " && event.shiftKey ? -1 : 0;
      if (!direction) return;
      if (canScrollInside(target, element, direction)) return;
      const keyDistance = event.key.startsWith("Arrow") ? 40 : window.innerHeight * .9;
      const next = destination(element, direction, window.scrollY + direction * keyDistance);
      if (next === null) return;
      prevent(event);
      if (moving || event.repeat) return;
      markInput();
      travel(next);
    };
    const touchstart = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : element;
      const point = event.touches[0];
      touch = event.touches.length === 1 && allowed(target, true) ? { x: point.clientX, y: point.clientY, target } : null;
      if (touch) {
        window.clearTimeout(quietTimer);
        quiet = false;
        if (!moving) consumed = false;
      }
    };
    const touchmove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) return;
      const delta = touch.y - event.touches[0].clientY;
      if (Math.abs(event.touches[0].clientX - touch.x) > Math.abs(delta)) return;
      if (canScrollInside(touch.target, element, delta)) { consumed = true; return; }
      const next = destination(element, Math.sign(delta), window.scrollY + delta * SCROLL_SENSITIVITY);
      if (next === null) return;
      prevent(event);
      if (moving || consumed || Math.abs(delta) * SCROLL_SENSITIVITY < 40) return;
      quiet = false;
      travel(next);
    };
    const touchend = () => { touch = null; markInput(); };
    const click = (event: MouseEvent) => {
      // Carousel/tooltip interaction must not release a frame into leftover momentum.
      if (event.target instanceof Element && event.target.closest(NAVIGATION)) reset();
    };

    element.addEventListener("wheel", wheel, { capture: true, passive: false });
    element.addEventListener("click", click, true);
    element.addEventListener("touchstart", touchstart, { passive: true });
    element.addEventListener("touchmove", touchmove, { capture: true, passive: false });
    element.addEventListener("touchend", touchend);
    element.addEventListener("touchcancel", touchend);
    window.addEventListener("keydown", keydown, true);
    mode.addEventListener("change", reset);
    return () => {
      continueRef.current = () => {};
      reset();
      element.removeEventListener("wheel", wheel, true);
      element.removeEventListener("click", click, true);
      element.removeEventListener("touchstart", touchstart);
      element.removeEventListener("touchmove", touchmove, true);
      element.removeEventListener("touchend", touchend);
      element.removeEventListener("touchcancel", touchend);
      window.removeEventListener("keydown", keydown, true);
      mode.removeEventListener("change", reset);
    };
  }, [enabled, root, runtime]);
  return useCallback((keyboard = false) => continueRef.current(keyboard), []);
}
