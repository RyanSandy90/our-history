# Reviewing the public source

Follow the [README](../README.md) to install dependencies. No authentication,
external service or required environment variable is involved. Runtime images,
models, decoder and DM Sans are served from this application.

## Automated checks

```sh
npx playwright install chromium
npm run typecheck
npm run build
npm test
```

The default Playwright run executes `tests/review.spec.ts` using installed
Playwright Chromium and starts a development server on `127.0.0.1:3100`.
It is intended as a portable review smoke suite, not the complete historical
regression suite. It checks the opening journey and three model assets, phone
touch navigation, and reduced-motion apology/focus behavior. Test output reports
the result of each run.

### Optional GitHub Actions

[`review-workflow.yml`](./review-workflow.yml) is a ready-to-enable workflow for
dependency auditing, type checking, building and the portable smoke checks.
It is a template, not an active workflow: the publishing GitHub OAuth sign-in
did not have the `workflow` scope needed to create Actions files. To enable it,
a repository maintainer can copy it to `.github/workflows/review.yml` and commit
using GitHub's editor or a credential permitted to manage workflows. Subsequent
pushes to `main` and pull requests will run the checks. The headed GPU test stays
local because it needs a graphical session.

The hero pixel regression is separate because it needs a graphical session and
uses a 1296 × 837 viewport at 2× device scale:

```sh
npm run test:gpu
```

To exercise an installed Google Chrome's GPU raster path, optionally provide its
absolute executable path:

```sh
PLAYWRIGHT_CHROME_PATH='/absolute/path/to/Google Chrome' npm run test:gpu
```

The path is machine-specific; omit it to use Playwright Chromium. The test makes
repeated journeys into the introduction and back, comparing photo coverage in
screenshots against the initial hero. It targets the missing-photo-strip
regression after the 45× zoom. A pass on one browser/GPU is not a guarantee for
all graphics drivers. Generated traces and screenshots are local diagnostics.

## Snapshot validation

The initial public snapshot was validated locally on 8 October 2026 with Node
24.13.1 and npm 11.8.0, before the hero was renamed to Our History:

- Fresh dependency installation with lifecycle scripts disabled.
- Type checking and the production build passed.
- All three portable browser checks passed in Playwright Chromium.
- The headed 2× hero pixel regression passed after three return journeys.
- The dependency audit reported no known vulnerabilities at the time of review.

These results describe that prior snapshot; they do not verify a subsequent
deployment or URL change. Automated GitHub Actions checks are not
enabled yet, and the audit result can change as new advisories are published.

After the Our History rename on 8 October 2026, this repository's type checking
and production build passed again. The separate hosted reference at
`/our-history-review/` passed its desktop journey and all three model checks;
its heading was also checked at 320, 390 and 1280px. The old `/our-story/`
address redirects to that separate review page.

## Manual review

1. Open `/` at 1280 × 832. Let the preloader finish, then compare the photo orbits,
   star zoom and three introduction stops with the
   [visual reference](https://aquinasweb.wpenginepowered.com/our-history-review/).
   The public build uses Georgia where that reference uses Ogg.
2. Advance with wheel, keyboard and the continue pill. Reverse back to the hero
   several times and check photographs remain fully painted and orbiting.
3. Visit all active chapters through 1937. Check long copy scrolling, date-rail
   keyboard navigation, previous/next controls and the final release to the footer.
4. Inspect the cross and building with drag, zoom and keyboard controls. Nano
   should stay front-facing and allow journey scrolling over its fixed view.
5. Repeat at a portrait phone width, then a short landscape viewport. Check the
   horizontal year rail, readable copy and single-finger journey gestures.
6. Enable reduced motion, navigate years, open/close View Apology and use Back
   to Start. Check focus remains usable and decorative motion is stopped.

## Review boundaries

This is a Next.js/React source snapshot with selected portable tests. Deployment
tools, the embed bundle, original model scenes, source-image archives and earlier
test evidence are excluded. The later rail dates are future content; activating
them requires both content/layout review and additional runtime images.

Keep existing attribution notices when making changes. [NOTICE.md](../NOTICE.md)
describes the source-review scope; [THIRD_PARTY.md](../THIRD_PARTY.md) identifies
component, font and reconstruction provenance.
