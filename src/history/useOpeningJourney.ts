import { useLayoutEffect, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PINNED_HISTORY_QUERY } from "./scroll";

/** Shared by gestures and anchors: the three reading stops live inside one pin. */
export function openingStops(root: HTMLElement) {
  const opening = root.querySelector(".history-opening");
  const pin = ScrollTrigger.getAll().find(item => item.trigger === opening && item.pin);
  return pin ? Array.from({ length: 4 }, (_, index) => pin.start + (pin.end - pin.start) * index / 3) : null;
}

export default function useOpeningJourney(root: RefObject<HTMLElement | null>) {
  const [reading, setReading] = useState({ frame: 0, ready: false });
  useLayoutEffect(() => {
    const element = root.current!;
    const opening = element.querySelector<HTMLElement>(".history-opening")!;
    const hero = element.querySelector<HTMLElement>(".history-hero")!;
    const zoom = hero.querySelector<HTMLElement>(".history-hero-zoom")!;
    const content = hero.querySelector<HTMLElement>(".history-hero-content")!;
    const crest = hero.querySelector<HTMLElement>(".history-crest")!;
    const panels = Array.from(element.querySelectorAll<HTMLElement>(".history-intro-panel"));
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(PINNED_HISTORY_QUERY, () => {
      // Timed reveals finish while the card rests; a fast wheel gesture cannot rush the text.
      const reveals = panels.map((panel, index) => {
        const words = panel.querySelectorAll(".history-text-word");
        const highlights = panel.querySelectorAll(".history-intro-highlight");
        gsap.set(words, { opacity: 0, yPercent: 35, filter: "blur(6px)" });
        gsap.set(highlights, { "--history-highlight": "0%" });
        return gsap.timeline({ paused: true, onComplete: () => {
          setReading(current => current.frame === index + 1 ? { ...current, ready: true } : current);
        } })
          .to(words, { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: .7, stagger: .045, ease: "power2.out", clearProps: "transform,filter" })
          .to(highlights, { "--history-highlight": "100%", duration: 1.275, stagger: .18, ease: "power2.inOut" }, ">+=.25");
      });
      let activeReveal = 0;
      // Measure in untransformed design coordinates, so refreshes mid-zoom stay exact.
      const starY = () => opening.clientHeight / 2 + (-content.offsetHeight / 2 + crest.offsetTop + crest.offsetHeight * .49) * (element.clientWidth < 900 ? 1 : element.clientWidth / 1280);
      const updateReading = (progress: number) => {
        const frame = progress < .6 ? 0 : Math.min(3, Math.floor(progress + .4));
        if (opening.dataset.activeFrame !== String(frame)) opening.dataset.activeFrame = String(frame);
        hero.inert = progress > .02;
        hero.setAttribute("aria-hidden", String(frame > 0));
        panels.forEach((panel, index) => {
          panel.inert = frame !== index + 1;
          panel.setAttribute("aria-hidden", String(frame !== index + 1));
        });
        if (element.dataset.opening === "ready" && frame !== activeReveal) {
          // Hold the outgoing words while their panel fades. Rewinding here
          // erased them before the incoming card had become readable.
          if (activeReveal) reveals[activeReveal - 1].pause();
          setReading({ frame, ready: false });
          if (frame) reveals[frame - 1].restart();
          activeReveal = frame;
        }
      };
      gsap.set(panels, { autoAlpha: 0 });
      updateReading(0);
      const sequence = gsap.timeline({
        scrollTrigger: {
          trigger: opening, start: "top top", end: () => `+=${opening.clientHeight * 3}`,
          pin: true, scrub: true, anticipatePin: 1, refreshPriority: 10,
          invalidateOnRefresh: true,
          onUpdate: self => updateReading(self.progress * 3),
          onRefresh: self => updateReading(self.progress * 3),
        },
      });
      // Repaint the scene at its current scale instead of retaining a huge 3D
      // surface, which can return with missing photo strips and clipped lines.
      sequence.fromTo(zoom, {
        scale: 1, y: 0, force3D: false, transformOrigin: () => `${opening.clientWidth / 2}px ${starY()}px`,
      }, { scale: 45, duration: .86, ease: "power3.in" }, 0)
        .to(zoom, { y: () => opening.clientHeight / 2 - starY(), duration: .48, ease: "power2.inOut" }, 0)
        .to(hero.querySelectorAll("h1, .history-hero-content p, .history-hero-actions, .history-hero-apology"), { autoAlpha: 0, duration: .22, ease: "power1.out" }, 0)
        .to(hero.querySelector(".history-orbit"), { autoAlpha: 0, duration: .25 }, .4)
        .to(hero, { autoAlpha: 0, duration: .2, ease: "power1.inOut" }, .58);

      panels.forEach((panel, index) => {
        const start = index + (index === 0 ? .55 : .4);
        sequence.fromTo(panel, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: index === 0 ? .35 : .5, ease: "power1.inOut" }, start);
        if (index < panels.length - 1) sequence.to(panel, { autoAlpha: 0, y: -12, duration: .65, ease: "power1.inOut" }, index + 1.15);
      });
      // Keep the final reading stop at exactly three viewport scrolls.
      sequence.to({}, { duration: .4 }, 2.6);

      return () => {
        reveals.forEach(reveal => reveal.kill());
        delete opening.dataset.activeFrame;
        [hero, ...panels].forEach(node => { node.inert = false; node.removeAttribute("aria-hidden"); });
      };
    }, element);
    return () => media.revert();
  }, [root]);
  return reading;
}
