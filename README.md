# Aquinas History — Next.js source review

The Next.js and React implementation of Aquinas College's interactive Our Story
experience, published for source review. It has one page route (`/`) and runs
locally without accounts, API keys, a database or environment configuration.

[View the visual reference](https://aquinasweb.wpenginepowered.com/our-story/).
This repository includes the runtime photographs, crest, wordmark and 3D assets
needed to review the experience. Ogg font binaries are excluded: serif text uses
the upright Georgia fallback, so typography and wrapping differ from the reference.

## Run

Use Node.js 24 (`.nvmrc`) and npm 11.8.0. The declared Node.js minimum is 22.12.0.

```sh
git clone https://github.com/RyanSandy90/aquinas-history-nextjs.git
cd aquinas-history-nextjs
nvm use
npm ci
npm run dev
```

Open [127.0.0.1:3000](http://127.0.0.1:3000). If you do not use nvm, select Node.js
24 with your preferred version manager. `.npmrc` disables dependency install
scripts; explicit project commands such as `npm run build` still run normally.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production Next.js build |
| `npm start` | Serve that production build on port 3000 |
| `npm run typecheck` | TypeScript validation |
| `npm test` | Portable browser smoke checks; starts its own server on port 3100 |
| `npm run test:gpu` | Optional headed, 2×-scale hero paint regression |

Install the test browser once before running browser checks:

```sh
npx playwright install chromium
npm run typecheck
npm run build
npm test
```

See [the review guide](./docs/REVIEW.md) for coverage, manual checks and the optional
system-Chrome GPU setup. An optional GitHub Actions template is included in
[`docs/review-workflow.yml`](./docs/review-workflow.yml); it is not active yet.
The headed GPU check runs separately in a graphical session.

## What is implemented

- A 1762–2027 rolling preloader, orbiting archive photographs, hover particles
  and a crest zoom leading into three introduction cards.
- One-stage wheel, trackpad, keyboard and swipe navigation, plus a clickable
  continue pill. Long chapter copy scrolls before the next year advances.
- **15 active chapters from 1762 to 1937** and a **49-date rail through 2027**.
  Later rail dates are visible for future content and cannot be selected.
- Interactive Celtic cross and CBC Perth models. Nano Nagle is a photo-referenced
  Gaussian-splat approximation, fixed to its detailed front view; it is not a scan.
- Responsive mobile reading stops, reduced-motion/document-flow layouts,
  keyboard year controls, an apology dialog and the closing/footer sections.

[Architecture](./docs/ARCHITECTURE.md) explains component boundaries, scroll
ownership, model reuse and the hero rendering constraint. This source snapshot
excludes the portable embed/Vite build, WordPress deployment tools, original
Blender scenes, source-reference images, historical Git history and operational
records. The runtime application and selected review tests are included.

## Rights and attribution

The source is available for review; there is no blanket MIT license for this
repository or its supplied artwork, copy and models. Rights remain with their
respective holders. See [NOTICE.md](./NOTICE.md), [THIRD_PARTY.md](./THIRD_PARTY.md)
and the retained component/font license files before reusing material.
