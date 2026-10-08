import { useLayoutEffect, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Timeline headings lead the body; introduction reveals belong to useOpeningJourney. */
export default function useTextStagger(root: RefObject<HTMLElement | null>) {
  const [complete, setComplete] = useState(false);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add({ animate: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, context => {
      if (context.conditions?.reduce) { setComplete(true); return; }
      const groups = Array.from(element.querySelectorAll<HTMLElement>("[data-text-stagger]"));
      const words = element.querySelectorAll<HTMLElement>(".history-text-word");
      // Translated words temporarily extend the copy's scroll bounds. Only expose
      // overflow after every word has settled into its final reading position.
      setComplete(false);
      // Set before paint; matchMedia restores readable text if motion is disabled.
      gsap.set(words, { opacity: 0, yPercent: 45 });
      const sequence = gsap.timeline({
        onComplete: () => setComplete(true),
        scrollTrigger: {
          trigger: element,
          start: "top 85%",
          once: true,
        },
      });
      groups.forEach((group, index) => {
        const targets = group.querySelectorAll<HTMLElement>(".history-text-word");
        sequence.to(targets, {
          opacity: 1, yPercent: 0, ease: "power2.out",
          duration: .6,
          stagger: { amount: index === 0 ? .28 : 1 },
          clearProps: "opacity,transform",
        }, index === 0 ? 0 : ">-=0.24");
      });
    }, element);
    // Cancels old chapter tweens and triggers during rapid navigation or unmount.
    return () => media.revert();
  }, [root]);
  return complete;
}
