# Architecture

## One page, shared sections

`src/app/page.tsx` renders `HistoryExperience` at `/`; `src/app/layout.tsx` provides
the document shell and CSS. Introduction cards, archive years, the apology and
footer are sections within that page, not separate routes.

`src/history/HistoryExperience.tsx` composes the preloader, `HeroOrbit`,
`StoryIntro`, `PinnedTimeline`, `HistoryEnd`, `SecondaryFooter`, the continue pill
and apology dialog. The main-site links use the public Aquinas website origin.
Section anchors are `#history-hero`, `#history-intro` and `#history-timeline`;
introduction and timeline links open their first reading stop.

| Module | Responsibility |
| --- | --- |
| `scroll.ts` | Lenis ownership, native/reduced-motion fallback and shared travel settings |
| `useChapterScroll.ts` | One gesture per stop, nested copy scrolling and continue-button travel |
| `useOpeningJourney.ts` | Opening pin, 45× star zoom and timed introduction reveals |
| `useSectionNavigation.ts` | Hash navigation, browser history and initial scroll restoration |
| `ScrollContinue.tsx` | Continue pill, reading delays, transition state and keyboard focus handoff |
| `useTextStagger.ts` | Chapter text reveal and enabling copy overflow afterward |
| `useTimelineModels.ts` | Model preparation, shared runtime lifetime and cancellation |
| `modelViewerRuntime.ts` | Three.js rendering, controls, model caching and disposal |
| `history.css` | Scoped design tokens, upright typography and responsive layouts |

## Motion and rendering constraints

Lenis moves the page; GSAP ScrollTrigger pins the opening and timeline. Gesture
locks wait for fresh input so trackpad momentum cannot skip reading stops.
Long copy consumes scrolling inside its reading region before the journey moves
on. The continue button uses those same destinations and easing.

The crest zoom reaches 45×. Its GSAP transform uses `force3D: false`, orbit cards
move with 2D translations, and the zoom/photo wrappers avoid persistent
`will-change` promotion. These choices prevent clipped cached raster tiles when
Chrome returns from the zoom. The optional GPU test checks painted photo pixels,
because correct DOM bounds alone did not detect the failure.

The continuous spectral ribbon uses a capped WebGL renderer with an SVG fallback.
Particles and decorative renderers stop when idle, hidden or offscreen.
Reduced motion removes the long pins, freezes decorative motion and exposes
direct year selection in document flow. Short viewports also use document flow;
portrait phones otherwise use full-screen stops and a horizontal year rail.

## Content and model assets

`src/data/history.json` holds 49 archive records and the introduction copy.
`entries.ts` selects the 15 records from 1762 through 1937, with visual overrides
from `src/data/figma-examples.json`. Later dates remain in the rail through 2027.
Only runtime images needed by the active chapters and hero are included here;
enabling later chapters also requires their corresponding image assets.

The timeline retains one prepared Three.js renderer across chapter changes.
It preloads the cross/building GLBs, the local Draco decoder and Nano's splat;
posters are failure fallbacks. Unmounting releases downloads and GPU resources.
Cross and building allow interaction and gentle automatic rotation. Nano's
341,033 Gaussians retain a fixed frontal view: its sides and rear are inferred,
and the reconstruction is not an authentic scan or multiview-trained capture.

## Typography in this source review

`assets.ts` loads the bundled DM Sans font through the FontFace API. The CSS
retains `"Aquinas Ogg", Georgia, serif`, with upright styling, but this repository
does not ship or request Ogg. Expect different glyph widths and line wrapping.

For a local comparison, a reviewer who has their own licensed upright Ogg webfont
can place it in `public/fonts/` with `Ogg` in its filename (already ignored by Git)
and add a corresponding
`Aquinas Ogg` FontFace entry to `assets.ts` with `style: "normal"` and the matching
weight. This is an optional local edit, not required setup; keep the licensed
font and loader change out of commits. No source-image archive, Blender build
tools, reconstruction weights or WordPress integration is included.
