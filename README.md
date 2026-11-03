# GradRight Counselor

The entire Counselor marketplace runs on **Next.js App Router, React 19, Tailwind 4 and a shared shadcn/ui design system**. All 19 product screens are native React routes. The workspace layout keeps the sidebar and header mounted during client navigation.

## Run

```bash
npm ci
npm run dev
```

Open [the workspace](http://127.0.0.1:3000/dashboard), [Profile](http://127.0.0.1:3000/profile), or [the design system](http://127.0.0.1:3000/design-system). The sign-up/login entry is `/`; student browse starts at `/marketplace`.

```bash
npm test
npm run format:check
npm run build
npm start
```

Node.js 20.9+ is required. Production builds use Next's supported Webpack builder; development uses Turbopack. Vercel detects Next.js and runs the normal build. No Vite or static prototype server is required.

## Structure

- `src/app/`: App Router pages, route metadata and layouts. `(workspace)` has the persistent shell; `(public)` contains authentication, onboarding and student-facing pages.
- `src/components/`: shared React shell, notifications, action slots, runtime provider and screen lifecycle boundary.
- `src/components/ui/`: official shadcn registry components, installed with the shadcn CLI and themed with the Figma tokens. Includes Sidebar, Button, Input, Textarea, Label, Card, NativeSelect, Dialog, Tabs, Switch, Table, Select, menus, Sheet and other shared primitives.
- `src/design-system/`: the supplied Figma colors, spacing, radius and stroke tokens, plus shared desktop/mobile recipes. Inter is bundled locally; every UI icon is a Lucide SVG. `registry.json` records the upstream component sources and their Figma adaptations.
- `src/features/<screen>/`: React view and route-scoped product workflow for each screen. Existing demo logic is preserved as ES modules; listeners, timers, observers, upload URLs and generated overlays are disposed on route changes. These modules are not a replacement backend.
- `src/lib/domain/`: shared browser data and services for accounts, people, calls, calendar, safety, testimonials, recording and Cal.com.
- `src/lib/runtime/`: the browser initialization, navigation and subscription lifecycle. No runtime script injection, iframe-based pages, or HTML page loading is used.
- `reference/`: frozen prototypes for historical comparison only. Not imported or served by Next.js.

All internal links use the new routes. Old `.html` bookmarks redirect and preserve query parameters. `/design-system` is the interactive catalog used to review control variants and tokens.

## Data and integrations

The current product remains a local demo: account verification, profiles, messages and payments use the existing mock data/browser storage. No production authentication, payment processing or new database has been introduced. The default signed-out workspace is a consistent verified demo; sign-up creates a pending demo account.

CSV source files live in `data/`. Rebuild the Next-consumed modules with:

```bash
python3 scripts/build-people-db.py
python3 scripts/build-calls-db.py
```

For Cal.com OAuth, copy `.env.example` to `.env.local` and configure the public client ID and registered `/calendar` callback. Access tokens remain in the existing browser integration state; never put secret tokens in `NEXT_PUBLIC_` variables.

`prepare-public.mjs` copies static assets/data and the independent AdmitRight project into `public/` before dev/build. AdmitRight's source and design are unchanged.
