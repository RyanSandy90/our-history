import { useEffect, useRef, useState, type RefObject } from "react";
import { useInView, useScroll } from "motion/react";
import { gsap } from "gsap";
import useReducedMotionPreference from "./useReducedMotionPreference";
import { createSpectralRibbonRenderer } from "./spectralRibbonRenderer";

/** One shared scroll-space ribbon, from the introduction through the footer. */
export default function SpectralRibbonBackdrop({ chapters }: { chapters: RefObject<HTMLDivElement | null> }) {
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(12);
  const [state, setState] = useState<"pending" | "ready" | "fallback">("pending");
  const visible = useInView(viewport);
  const reduced = useReducedMotionPreference();
  const { scrollYProgress } = useScroll({ target: chapters, offset: ["start start", "end end"], trackContentSize: true });

  useEffect(() => {
    if (!visible) return;
    const element = viewport.current!;
    const target = canvas.current!;
    let renderer: ReturnType<typeof createSpectralRibbonRenderer>;
    try {
      const style = getComputedStyle(element);
      renderer = createSpectralRibbonRenderer(target, ["--history-ink", "--history-red"].map(token => style.getPropertyValue(token)));
    } catch {
      setState("fallback");
      return;
    }

    let travelRange = 0;
    const draw = () => renderer.draw(reduced ? 12 : elapsed.current, reduced ? 0 : scrollYProgress.get() * travelRange);
    const resize = () => {
      const height = Math.max(element.clientHeight, 1);
      // Follow the complete pinned scroll distance at a quieter parallax pace.
      travelRange = Math.max(0, chapters.current!.clientHeight - height) / height * .28;
      renderer.resize(element.clientWidth, height);
      draw();
    };
    resize();
    setState("ready");
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    observer.observe(chapters.current!);
    let accumulated = 0;
    let lost = false;
    const tick = (_time: number, delta: number) => {
      if (document.hidden || lost) return;
      const frameDelta = Math.min(delta, 50);
      elapsed.current += frameDelta / 1000;
      accumulated += frameDelta;
      if (accumulated < 1000 / 30) return;
      accumulated %= 1000 / 30;
      draw();
    };
    const loseContext = () => {
      lost = true;
      gsap.ticker.remove(tick);
      observer.disconnect();
      setState("fallback");
    };
    target.addEventListener("webglcontextlost", loseContext);
    if (!reduced) gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      observer.disconnect();
      target.removeEventListener("webglcontextlost", loseContext);
      renderer.dispose();
    };
  }, [visible, reduced, chapters, scrollYProgress]);

  return <div className="history-ribbon-track" aria-hidden="true" data-ribbon-state={state} data-ribbon-motion={reduced ? "still" : visible ? "running" : "paused"}>
    <div className="history-ribbon-viewport" ref={viewport}>
      <div className="history-ribbon-surface">
        <svg className="history-ribbon-fallback" viewBox="0 0 1280 832" preserveAspectRatio="none">
          <path d="M 170 -180 C 50 160 1250 570 1100 1012" />
          <path d="M 170 -180 C 50 160 1250 570 1100 1012" />
        </svg>
        <canvas ref={canvas} className="history-ribbon-canvas" />
      </div>
    </div>
  </div>;
}
