import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { loadHistoryFonts } from "./assets";
import YearCounter from "./YearCounter";
import useReducedMotionPreference from "./useReducedMotionPreference";

interface Props {
  assetBase: string;
  root: RefObject<HTMLElement | null>;
  revealing: boolean;
  onReveal: () => void;
  onComplete: () => void;
}

export default function HistoryPreloader({ assetBase, root, revealing, onReveal, onComplete }: Props) {
  const year = useMotionValue(1762);
  const curtain = useMotionValue(0);
  const opacity = useMotionValue(1);
  const clipPath = useTransform(curtain, value => `inset(0% 0% ${value}% 0%)`);
  const reduced = useReducedMotionPreference();
  const [fontsReady, setFontsReady] = useState(false);
  const [settled, setSettled] = useState(false);

  // Keep Lenis/native scrolling and keyboard focus behind the opening screen idle.
  // Restore the host's exact overflow setting, including when an embed is unmounted early.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const overflow = html.style.getPropertyValue("overflow");
    const priority = html.style.getPropertyPriority("overflow");
    html.style.setProperty("overflow", "hidden");
    const prevent = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const preventKeys = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key) && !(event.target instanceof HTMLButtonElement)) prevent(event);
    };
    window.addEventListener("wheel", prevent, { passive: false, capture: true });
    window.addEventListener("touchmove", prevent, { passive: false, capture: true });
    window.addEventListener("keydown", preventKeys, true);
    return () => {
      if (overflow) html.style.setProperty("overflow", overflow, priority);
      else html.style.removeProperty("overflow");
      window.removeEventListener("wheel", prevent, true);
      window.removeEventListener("touchmove", prevent, true);
      window.removeEventListener("keydown", preventKeys, true);
    };
  }, []);

  useEffect(() => {
    if (revealing) return;
    let alive = true;
    let controls: ReturnType<typeof animate> | undefined;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) => new Promise<void>(resolve => { timers.add(setTimeout(resolve, ms)); });
    const run = async () => {
      // Font and image failures must never trap a visitor on the loading screen.
      await Promise.race([loadHistoryFonts(assetBase).catch(() => {}), wait(1200)]);
      if (!alive) return;
      setFontsReady(true);
      const photos = Array.from(root.current?.querySelectorAll<HTMLImageElement>(".history-hero img") ?? []);
      const imagesReady = Promise.race([Promise.all(photos.map(image => image.decode().catch(() => {}))), wait(3000)]);
      if (reduced) {
        year.set(2027);
        await Promise.race([imagesReady, wait(400)]);
      } else {
        year.set(1762);
        await wait(350);
        if (!alive) return;
        controls = animate(year, 2027, { duration: 2.6, ease: [.45, 0, .2, 1] });
        await controls;
        if (!alive) return;
        await Promise.all([imagesReady, wait(450)]); // Let the digit springs settle on 2027.
      }
      if (!alive) return;
      setSettled(true);
      await wait(reduced ? 0 : 260);
      if (alive) onReveal();
    };
    void run();
    return () => { alive = false; controls?.stop(); timers.forEach(clearTimeout); };
  }, [assetBase, reduced, revealing, root, year, onReveal]);

  useEffect(() => {
    if (!revealing) return;
    // Animate a numeric value: browsers shorten inset(0% 0% 0% 0%) to inset(0%),
    // which otherwise makes a string-based clip-path transition jump to its end.
    const controls = animate(reduced ? opacity : curtain, reduced ? 0 : 100, {
      duration: reduced ? .15 : .95,
      ease: [.76, 0, .24, 1],
      onComplete,
    });
    return () => controls.stop();
  }, [revealing, reduced, curtain, opacity, onComplete]);

  return <motion.div className="history-preloader" role="region" aria-label="Opening Our History"
    data-phase={revealing ? "revealing" : settled ? "settled" : fontsReady ? "counting" : "preparing"}
    data-lenis-prevent style={{ clipPath, opacity }}>
    <p className="history-sr-only" role="status">{revealing ? "Our History is ready." : "Loading Our History."}</p>
    <motion.div className="history-preloader-centre" initial={false} animate={{ opacity: fontsReady ? 1 : 0, y: revealing && !reduced ? -56 : 0 }} transition={{ duration: revealing ? .7 : .25 }}>
      <p className="history-preloader-label">Aquinas College <span>Our History</span></p>
      <YearCounter value={year} reduced={!!reduced} />
      <p className="history-preloader-range">1762 <span aria-hidden="true" /> 2027</p>
    </motion.div>
  </motion.div>;
}
