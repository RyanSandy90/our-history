import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { createParticleImage, type ParticleImage } from "./heroParticleImage";

export default function useHeroParticles(root: RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled) return;
    const hero = element.closest<HTMLElement>(".history-hero")!;
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)");
    // The orbit uses a fixed design coordinate system, scaled by its parent.
    const width = element.clientWidth;
    const height = element.clientHeight;
    const fields = new Map<HTMLElement, ParticleImage>();
    let canvas: HTMLCanvasElement | null = null;
    let context: CanvasRenderingContext2D | null = null;
    let visible = true;
    let running = false;
    let accumulated = 0;
    const tint = getComputedStyle(element).getPropertyValue("--history-red").trim();
    const stop = () => { gsap.ticker.remove(tick); running = false; accumulated = 0; };
    const reset = () => {
      stop();
      fields.forEach(field => field.restore());
      fields.clear();
      if (canvas) { canvas.width = 0; canvas.height = 0; canvas.remove(); }
      canvas = null;
      context = null;
    };
    const tick = (_time: number, delta: number) => {
      if (hero.inert) { reset(); return; }
      if (!context || !canvas) return;
      accumulated += Math.min(delta, 50) / 1000;
      if (accumulated < 1 / 30) return;
      context.clearRect(0, 0, width, height);
      fields.forEach((field, card) => { if (!field.draw(context!, accumulated)) fields.delete(card); });
      accumulated = 0;
      if (!fields.size) reset();
    };
    const cardAt = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(".history-orbit-card") : null;
    const move = (event: PointerEvent) => {
      const card = cardAt(event.target);
      // Restoring an inert hero generates pointerover under a stationary mouse.
      // Only a fresh pointer movement may scatter a photo or pause its orbit.
      if (!card || hero.inert || event.pointerType === "touch" || !media.matches || !visible || document.hidden) return;
      let field = fields.get(card);
      if (!field) {
        const created = createParticleImage(card, tint);
        if (!created) return;
        if (!canvas) {
          canvas = document.createElement("canvas");
          context = canvas.getContext("2d");
          if (!context) { created.restore(); canvas = null; return; }
          const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          canvas.width = Math.ceil(width * dpr);
          canvas.height = Math.ceil(height * dpr);
          context.scale(dpr, dpr);
          canvas.className = "history-orbit-particles";
          canvas.setAttribute("aria-hidden", "true");
          element.appendChild(canvas);
        }
        // Bound work during rapid pointer sweeps across many photos.
        if (fields.size >= 6) {
          const oldest = fields.values().next().value!;
          oldest.restore();
          fields.delete(oldest.card);
        }
        field = created;
        fields.set(card, field);
      }
      field.enter();
      field.move(event.clientX, event.clientY);
      if (!running) { running = true; gsap.ticker.add(tick); }
    };
    const leave = (event: PointerEvent) => {
      const card = cardAt(event.target);
      if (card && card !== cardAt(event.relatedTarget)) fields.get(card)?.leave();
    };
    const visibility = () => { if (document.hidden) reset(); };
    // Enabling motion can notify after the first hover; preserve that new field.
    const preference = () => { if (!media.matches) reset(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) reset(); });
    observer.observe(element);
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerout", leave, { passive: true });
    element.addEventListener("pointercancel", reset);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", preference);
    return () => {
      reset();
      observer.disconnect();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerout", leave);
      element.removeEventListener("pointercancel", reset);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", preference);
    };
  }, [root, enabled]);
}
