import { useCallback, useEffect, useLayoutEffect, type RefObject } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OPENING_TRAVEL_SECONDS, type ScrollRuntime } from "./scroll";
import { openingStops } from "./useOpeningJourney";

type Section = "history-hero" | "history-intro" | "history-timeline" | "history-end";
const sections = new Set<Section>(["history-hero", "history-intro", "history-timeline", "history-end"]);
const sectionFromHash = (hash: string) => sections.has(hash.slice(1) as Section) ? hash.slice(1) as Section : null;

/** Keep browser restoration and native fragment jumps out of the pinned timeline. */
export default function useSectionNavigation(
  root: RefObject<HTMLElement | null>, runtime: RefObject<ScrollRuntime | null>,
  opening: "loading" | "revealing" | "ready", startAtHero: boolean,
) {
  const navigate = useCallback((section: Section, immediate = false, updateAddress = true) => {
    const target = root.current?.querySelector<HTMLElement>(`#${section}`);
    if (!target) return;
    const pin = ScrollTrigger.getAll().find(item => item.trigger === target && item.pin);
    const stops = root.current && openingStops(root.current);
    const openingTop = stops && (section === "history-hero" ? stops[0] : section === "history-intro" ? stops[1] : null);
    const top = openingTop ?? pin?.start ?? target.getBoundingClientRect().top + window.scrollY;
    if (updateAddress && window.location.hash !== `#${section}`) {
      window.history.pushState(window.history.state, "", `#${section}`);
    }
    if (runtime.current) runtime.current.to(top, immediate, undefined, openingTop !== null ? OPENING_TRAVEL_SECONDS : undefined);
    else window.scrollTo({ top, behavior: "instant" });
  }, [root, runtime]);

  const alignLanding = useCallback(() => {
    const section = sectionFromHash(window.location.hash) ?? (startAtHero ? "history-hero" : null);
    if (!section) return;
    ScrollTrigger.refresh();
    navigate(section, true, false);
  }, [navigate, startAtHero]);

  useLayoutEffect(() => {
    // The standalone page owns restoration; an embedded module leaves its host alone.
    if (!startAtHero) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const hero = root.current?.querySelector<HTMLElement>("#history-hero");
    if (hero) window.scrollTo({ top: hero.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
    return () => { window.history.scrollRestoration = previous; };
  }, [root, startAtHero]);

  useLayoutEffect(() => {
    if (opening === "loading") return;
    // Position before the curtain lifts, then once more after its scroll lock is removed.
    alignLanding();
  }, [opening, alignLanding]);

  useEffect(() => {
    if (opening !== "ready") return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(alignLanding);
    };
    const show = (event: PageTransitionEvent) => { if (event.persisted) schedule(); };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || link.target && link.target !== "_self") return;
      const url = new URL(link.href, window.location.href);
      const section = sectionFromHash(url.hash);
      if (!section || url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      if (!root.current?.querySelector(`#${section}`)) return;
      event.preventDefault();
      navigate(section);
    };
    window.addEventListener("hashchange", schedule);
    window.addEventListener("popstate", schedule);
    window.addEventListener("pageshow", show);
    document.addEventListener("click", click);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("pageshow", show);
      document.removeEventListener("click", click);
    };
  }, [opening, alignLanding, navigate, root]);

  return navigate;
}
