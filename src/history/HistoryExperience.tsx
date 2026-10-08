"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ApologyModal from "./ApologyModal";
import HeroOrbit from "./HeroOrbit";
import StoryIntro from "./StoryIntro";
import HistoryEnd from "./HistoryEnd";
import SecondaryFooter from "./SecondaryFooter";
import PinnedTimeline from "./PinnedTimeline";
import SpectralRibbonBackdrop from "./SpectralRibbonBackdrop";
import HistoryPreloader from "./HistoryPreloader";
import FluidGlassCursor from "./FluidGlassCursor";
import ScrollContinue from "./ScrollContinue";
import useChapterScroll from "./useChapterScroll";
import useSectionNavigation from "./useSectionNavigation";
import useOpeningJourney, { openingStops } from "./useOpeningJourney";
import { createScrollRuntime, timelineStop, type LenisLike, type ScrollRuntime } from "./scroll";
import { loadHistoryFonts } from "./assets";

export interface HistoryExperienceProps {
  /** Public asset folder: empty for Next.js, the enqueued bundle URL in WordPress. */
  assetBase?: string;
  /** Reuse the host's Lenis instance without ticking or destroying it. */
  hostLenis?: LenisLike;
  startAtHero?: boolean;
  siteBase?: string;
  /** WordPress normally supplies its own footer. */
  showSiteFooter?: boolean;
}

/** The single page composition shared by Next.js and the WordPress mount. */
export default function HistoryExperience({ assetBase = "", hostLenis, startAtHero = false, siteBase = "https://www.aquinas.wa.edu.au", showSiteFooter = true }: HistoryExperienceProps) {
  const root = useRef<HTMLElement>(null);
  const runtime = useRef<ScrollRuntime | null>(null);
  const chapters = useRef<HTMLDivElement>(null);
  const [apologyOpener, setApologyOpener] = useState<HTMLElement | null>(null);
  const [opening, setOpening] = useState<"loading" | "revealing" | "ready">("loading");
  const [heroReady, setHeroReady] = useState(false);
  const revealHome = useCallback(() => setOpening("revealing"), []);
  const finishOpening = useCallback(() => setOpening("ready"), []);
  const finishHeroReveal = useCallback(() => setHeroReady(true), []);
  const reading = useOpeningJourney(root);
  const continueJourney = useChapterScroll(root, runtime, opening === "ready");
  const navigate = useSectionNavigation(root, runtime, opening, startAtHero);

  useEffect(() => {
    if (opening !== "ready") return;
    ScrollTrigger.refresh();
  }, [opening]);

  useEffect(() => {
    const element = root.current!;
    runtime.current = createScrollRuntime(hostLenis);
    let alive = true;
    let refreshFrame = 0;
    let previousWidth = 0;
    let previousHeight = 0;
    // Hero follows the Figma width; reading panels also fit the viewport height.
    const resize = () => {
      const width = element.clientWidth;
      const height = window.innerHeight;
      element.style.setProperty("--design-scale", String(width / 1280));
      element.style.setProperty("--chapter-scale", String(Math.min(width / 1280, height / 832)));
      if (previousWidth && (width !== previousWidth || height !== previousHeight)) {
        const openingPin = ScrollTrigger.getAll().find(pin => pin.trigger === element.querySelector(".history-opening") && pin.pin);
        const timelinePin = ScrollTrigger.getAll().find(pin => pin.trigger === element.querySelector(".history-timeline") && pin.pin);
        const y = window.scrollY;
        const frame = openingPin && y >= openingPin.start - 3 && y <= openingPin.end + 3 ? Number(element.querySelector<HTMLElement>(".history-opening")?.dataset.activeFrame) : null;
        const dates = element.querySelectorAll<HTMLButtonElement>(".history-date-rail button");
        const year = timelinePin && y >= timelinePin.start && y < timelinePin.end ? Number(element.querySelector<HTMLElement>(".history-date[aria-current]")?.dataset.index) : null;
        const settled = !element.hasAttribute("data-scroll-locked");
        // Refresh pins with the new design scale on the next frame, rather than
        // waiting for GSAP's resize debounce while the hero uses an old width.
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          // Browser toolbars and orientation can change the mobile viewport.
          // Keep a settled reading card/year in place after remeasuring its pin.
          if (!settled) return;
          const stops = openingStops(element);
          const pin = ScrollTrigger.getAll().find(item => item.trigger === element.querySelector(".history-timeline") && item.pin);
          if (frame !== null && stops) runtime.current?.to(stops[frame], true);
          else if (year !== null && pin) runtime.current?.to(timelineStop(pin, year, dates.length), true);
        });
      }
      previousWidth = width;
      previousHeight = height;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    loadHistoryFonts(assetBase).then(() => { if (alive) ScrollTrigger.refresh(); }).catch(error => console.warn("Aquinas preview fonts could not be loaded", error));
    const preferences = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateRuntime = () => { runtime.current?.destroy(); runtime.current = createScrollRuntime(hostLenis); };
    preferences.addEventListener("change", updateRuntime);
    return () => {
      alive = false;
      cancelAnimationFrame(refreshFrame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      preferences.removeEventListener("change", updateRuntime);
      runtime.current?.destroy();
      runtime.current = null;
    };
  }, [assetBase, hostLenis]);

  const openApology = (event: MouseEvent<HTMLButtonElement>) => {
    runtime.current?.to(window.scrollY, true);
    setApologyOpener(event.currentTarget);
  };
  const closeApology = useCallback(() => setApologyOpener(null), []);
  const restart = () => {
    navigate("history-hero", true);
    // Return keyboard users to the beginning as well as moving the viewport.
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".history-hero-actions button")?.focus({ preventScroll: true }));
  };

  return <main className="aquinas-history" ref={root} data-opening={opening}>
    <FluidGlassCursor root={root} enabled={opening === "ready"} />
    {opening !== "ready" && <HistoryPreloader assetBase={assetBase} root={root} revealing={opening === "revealing"} onReveal={revealHome} onComplete={finishOpening} />}
    <div className="history-page" inert={opening !== "ready"}>
      <a className="history-skip-link" href="#history-timeline" onClick={event => {
        event.preventDefault();
        navigate("history-timeline", true);
        root.current?.querySelector<HTMLButtonElement>("#history-timeline [aria-current]")?.focus({ preventScroll: true });
      }}>Skip to the timeline</a>
      <div className="history-chapters" ref={chapters}>
        <SpectralRibbonBackdrop chapters={chapters} />
        <div className="history-opening">
          <HeroOrbit assetBase={assetBase} revealed={opening !== "loading"} onJourney={() => navigate("history-intro")} onRevealComplete={finishHeroReveal} onApology={openApology} />
          <StoryIntro />
        </div>
        <PinnedTimeline assetBase={assetBase} runtime={runtime} />
        <HistoryEnd siteBase={siteBase} onRestart={restart} />
      </div>
      <ScrollContinue root={root} enabled={opening === "ready"} heroReady={heroReady} reading={reading} suspended={!!apologyOpener} onContinue={continueJourney} />
      {showSiteFooter && <SecondaryFooter assetBase={assetBase} siteBase={siteBase} />}
      {apologyOpener && <ApologyModal opener={apologyOpener} onClose={closeApology} />}
    </div>
  </main>;
}
