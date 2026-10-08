# Third-party credits and provenance

These credits identify adapted code, runtime dependencies and design references.
They do not grant a blanket license to the repository or its supplied assets;
see [NOTICE.md](./NOTICE.md).

## Retained licenses

| Material | Attribution and retained terms |
| --- | --- |
| `YearCounter.tsx` | Adapted from [React Bits Counter](https://reactbits.dev/components/counter), © 2026 David Haz; [MIT + Commons Clause](./public/licenses/react-bits.txt) |
| Spectral ribbon shader | Adapted from [Componentry Spectral Ribbon](https://componentry.dev/docs/components/spectral-ribbon), © 2026 Harsh Jadhav; [MIT](./public/licenses/componentry.txt) |
| Three.js | © 2010–2026 three.js authors; [MIT](./public/licenses/three.txt) |
| Bundled Draco decoder | [Apache License 2.0](./public/licenses/draco.txt) |
| TripoSR reconstruction tool | © 2024 Tripo AI & Stability AI; [MIT](./public/licenses/triposr.txt) |
| DM Sans webfont | © 2014 The DM Sans Project Authors; [SIL Open Font License 1.1](./public/fonts/DM-Sans-OFL.txt) |

Other installed npm packages retain their own license notices. No Ogg font
binaries are included; the CSS uses an upright Georgia fallback.

The Componentry shader source was retrieved from its
[registry](https://componentry.dev/r/spectral-ribbon.json) on 7 October 2026.
The integration adds Aquinas colours, a continuous scroll-relative curve,
visibility-aware rendering, a capped drawing buffer, reduced-motion support and
an SVG fallback. Curve samples are calculated on the CPU once per frame.

## Supplied assets and 3D reconstruction

The archive photographs, crest, history copy and introduction/closing layouts
come from supplied Aquinas design materials. The secondary footer's content,
links, layout and wordmark come from the Aquinas website. The runtime cross and
CBC Perth models were exported from supplied editable model scenes. Source
scenes and reference-image archives are excluded from this source-review copy.
Those materials retain their respective rights; the licenses above do not
relicense the artwork, photographs, text or models.

Nano Nagle is a photo-referenced approximation generated using
[TripoSR](https://github.com/VAST-AI-Research/TripoSR). An image-generation tool
created an isolated reference from supplied statue photographs and
[Presentation Sisters England's detail image](https://www.pbvmengland.co.uk/meet-nano-nagle).
The inferred surface was sampled into Gaussian ellipsoids with photographic
frontal detail. It is not an authentic scan or an aligned multiview capture;
inferred sides and rear are less reliable, and the application locks the front
view. `gaussianSplat.ts` and `gaussianSplatShaders.ts` are original renderer
implementations. Reconstruction weights and Python ML dependencies are excluded.

## Original implementations inspired by public references

The following treatments were implemented locally. No gated Pro component
source, Telescope assets or liquid-metal component source was copied:

- Apology dialog: [React Bits Pro Modal Cards](https://pro.reactbits.dev/docs/components/modal-cards).
  Native dialog semantics, focus restoration and scroll cleanup are local.
- Start Your Journey outline: [Originkit Neon Glow Button](https://www.originkit.dev/?cat=button).
  Original Aquinas-coloured CSS with a reduced-motion treatment.
- Continue pill: [@johuniq's Liquid Metal Button](https://21st.dev/@johuniq/components/liquid-metal-button).
  Original CSS rim/glass styling with local reading delays, navigation and fades.
- Model interactions: [React Bits Model Viewer](https://reactbits.dev/components/model-viewer).
  Original Three.js/OrbitControls integration and shared renderer lifecycle.
- Pointer lens: [React Bits Fluid Glass](https://reactbits.dev/components/fluid-glass).
  Original DOM/SVG backdrop refraction with a translucent fallback.
- Hover particles: [React Bits Pro Particle Image](https://pro.reactbits.dev/docs/components/particle-image).
  Original Canvas 2D sampling of the supplied archive photographs.
- Introduction words and highlights: [Staggered Text](https://pro.reactbits.dev/docs/components/staggered-text)
  and [Blur Highlight](https://pro.reactbits.dev/docs/components/blur-highlight).
  Original GSAP/CSS timing; timeline copy uses the same local reveal approach.
- Crest zoom: [Telescope](https://telescope.fyi/). Original GSAP/Lenis implementation.

For provenance, earlier superseded treatments referenced
[Skiper UI #19](https://skiper-ui.com/v1/skiper19),
[Skiper UI #72](https://skiper-ui.com/v1/skiper72) and
[React Bits Web Threads](https://reactbits.dev/backgrounds/web-threads).
The retained Skiper notice states: “Skiper UI's free version permits personal
and commercial use and modification with attribution.” Those former backgrounds
and horizontal introduction treatment are not included in this snapshot.
