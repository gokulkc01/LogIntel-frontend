# LogIntel — Frontend

> A dark-terminal security intelligence UI for real-time log analysis, threat visualization, and AI-powered insights.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

---

## Table of Contents

- [Overview](#overview)
- [UI Architecture](#ui-architecture)
- [Component Reference](#component-reference)
- [State Management](#state-management)
- [API Client](#api-client)
- [Design System](#design-system)
- [Features](#features)
- [Local Setup](#local-setup)
- [Deployment (Render / Vercel)](#deployment)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Overview

LogIntel's frontend is a three-panel, terminal-aesthetic React application built with Vite and Tailwind CSS. It communicates with the FastAPI backend over a proxied API and supports both synchronous JSON responses and real-time SSE streaming.

Key frontend capabilities:

- **Three-panel layout** — Input, Log Viewer, Analysis — collapsing to a tabbed layout on mobile
- **Drag & drop file upload** via react-dropzone (`.log`, `.txt`, `.pdf`, `.doc`, `.docx`, max 10 MB)
- **Virtualized log viewer** with color-coded risk rows and inline value highlighting
- **Real-time SSE streaming** — findings appear line-by-line as the backend detects them
- **Animated risk dial** driven by Framer Motion
- **PDF report generation** — downloads a full security report via jsPDF, client-side, no server round-trip
- **Dark / light mode** toggle with CSS variable theming, persisted to `localStorage`
- **Guided first-time tour** — spotlight overlay with step-by-step tooltips, auto-starts on first visit
- **Zustand state** with `localStorage` persistence so analysis results survive page refresh

---

## UI Architecture

```
App.jsx
├── Header bar (logo, mobile tabs, theme toggle, tour button)
│
├── [Desktop] Three-panel flex layout
│   ├── #input-panel    → InputPanel.jsx
│   ├── #log-viewer     → LogViewer.jsx
│   └── #insights-panel → InsightsPanel.jsx
│
└── [Mobile] Single-panel tabbed layout
    ├── Tab 0 → InputPanel.jsx
    ├── Tab 1 → LogViewer.jsx
    └── Tab 2 → InsightsPanel.jsx

Tour.jsx          (fixed overlay, z-index 9999, anchored to panel IDs)
```

### Rendering strategy

The app is a **pure SPA** — no server-side rendering. Vite proxies `/api/*` to `http://localhost:8000` in development. In production the `VITE_API_BASE_URL` env variable is used instead, pointing to the deployed backend.

### Streaming architecture

```
analyzeStream() / analyzeUploadStream()
  │
  ├── fetch() with ReadableStream reader
  ├── TextDecoder with stream:true
  ├── Split on "\n\n" SSE boundaries
  │
  ├── onChunk(data)    → appendStreamFindings() + setStreamProgress()
  └── onComplete(data) → finalizeStream()  ← sets result + lastCompletedResult
```

The stream parser handles partial chunks correctly by keeping an internal `buffer` that accumulates bytes until a complete `data: {...}\n\n` frame is available.

---

## Component Reference

### `InputPanel.jsx`

The left panel. Handles all input collection and triggers analysis.

**Responsibilities:**
- Input type selector (Log file / Text / PDF·Doc / SQL / Chat)
- Drag & drop file upload via `useDropzone`
- Large file handling — reads first 64 KB as a UI preview; the full binary is sent to the backend as a `FormData` upload via `analyzeUpload` / `analyzeUploadStream`
- Textarea for paste input
- Option toggles: Mask sensitive values, Block high risk, Deep log analysis, Real-time streaming
- Restart button (clears results, resets stream state)
- Analyze button (disabled while busy, fires `analyzeStream` or `analyze` based on streaming toggle)

**File upload flow:**
```
onDrop(file)
  ├── .log / .txt  → read as text, show in textarea
  ├── .pdf / .docx → read first 64KB as preview, store File object
  │                  → show "[Binary document selected]" message
  └── handleAnalyze()
        ├── streaming=true  → analyzeUploadStream (FormData + SSE)
        └── streaming=false → analyzeUpload (FormData + JSON)
```

### `LogViewer.jsx`

The center panel. Displays parsed log lines with risk highlighting.

**Responsibilities:**
- Splits `content` on `\n` into individual lines
- Builds a `findingsByLine` map: `{line_index → highest_risk_finding}`
- Renders up to 200 lines by default with a "Show all N lines" button for large files
- Color-codes rows: red border for critical, amber for high, orange for medium
- Inline `<mark>` highlighting of the matched value within the line text
- Risk badge per line showing `finding.type` in uppercase
- Streaming progress indicator (pulsing green dot while streaming, static on complete)
- Auto-scrolls to bottom during active streaming via a `bottomRef`
- Shows a preview-truncated banner for large uploaded files

**Risk row colors:**

| Risk | Row class |
|---|---|
| critical | `bg-red-500/10 border-l-2 border-red-500/50` |
| high | `bg-amber-500/8 border-l-2 border-amber-500/40` |
| medium | `bg-orange-500/8 border-l-2 border-orange-500/30` |

### `InsightsPanel.jsx`

The right panel. Displays the full analysis result.

**Responsibilities:**
- Animated SVG risk dial (0–20) using Framer Motion `strokeDashoffset` animation
- Risk level badge (CRITICAL / HIGH / MEDIUM / LOW)
- Summary text
- 4-column severity count grid
- Findings list (max 150 shown, "Show all" button for more) with animated entry via `AnimatePresence`
- AI insights numbered list
- PDF download button (appears only when `result` is populated)
- "Showing last completed analysis" banner during a new streaming run

**Uses `activeResult = result || lastCompletedResult`** — so the panel retains the previous run's data while a new analysis is in progress.

### `RiskBadge.jsx`

Reusable pill badge. Takes `level` (critical/high/medium/low) and optional `label`. Used in both the log viewer row badges and the findings list.

### `Tour.jsx`

Guided tour overlay. Uses `TOUR_STEPS` exported from `analysisStore.js`.

**How it works:**
1. On mount of each step, calls `document.getElementById(step.target)` to find the target panel
2. Adds `tour-highlight` CSS class (blue ring via `box-shadow`)
3. Computes tooltip position via `computeTooltipStyle()` — places tooltip to the right/left/below the target, clamped to viewport, auto-flips if it would overflow
4. Renders a `motion.div` tooltip with progress pills, step counter, title, body, Skip and Next buttons
5. Backdrop `div` covers the page; clicking it calls `endTour()`
6. On tour end, sets `tour_seen` in `localStorage` so it never auto-starts again

**Tour steps:**

| Step | Target ID | Description |
|---|---|---|
| 1 | `input-panel` | Overview of the input panel |
| 2 | `type-selector` | Input type selector explanation |
| 3 | `options-panel` | Analysis options explanation |
| 4 | `log-viewer` | Log viewer color coding |
| 5 | `insights-panel` | Risk dial and AI insights |

---

## State Management

All state lives in a single Zustand store (`analysisStore.js`) with `localStorage` persistence via `zustand/middleware`.

### Store shape

```js
{
  // Theme
  theme: 'dark' | 'light',

  // Tour
  tourActive: boolean,
  tourStep: number,

  // Analysis result
  result: AnalyzeResponse | null,
  lastCompletedResult: AnalyzeResponse | null,  // retained during new run
  isLoading: boolean,
  error: string | null,

  // Streaming
  isStreaming: boolean,
  streamFindings: Finding[],
  streamProgress: { chunk: number, total: number },
  streamComplete: boolean,

  // Input
  inputType: 'log' | 'text' | 'file' | 'sql' | 'chat',
  content: string,
  selectedFile: File | null,          // NOT persisted (File objects can't be serialized)
  requiresFileReselect: boolean,      // set to true on restore if file was selected
  contentPreviewTruncated: boolean,
  filename: string,
  options: {
    mask: boolean,
    block_high_risk: boolean,
    log_analysis: boolean,
    streaming: boolean,
  }
}
```

### Persistence strategy

The `partialize` function excludes `selectedFile` (not serializable) and all transient streaming state. On restore, if a file was previously selected, `requiresFileReselect` is set to `true` and the UI shows a "re-select your file" banner.

`lastCompletedResult` is persisted so the analysis panel is not blank on page refresh — it shows the last known result until a new analysis completes.

### Key actions

| Action | Effect |
|---|---|
| `startStream()` | Resets findings, progress, marks streaming=true |
| `appendStreamFindings(findings)` | Appends to `streamFindings[]` |
| `finalizeStream(summary)` | Sets `result` + `lastCompletedResult`, marks streaming=false |
| `reset()` | Clears result and stream state (preserves input) |
| `restartAnalysis()` | Same as reset — used by the Restart button |
| `toggleTheme()` | Flips dark/light, updates `data-theme` on `<html>`, persists to localStorage |
| `startTour()` | Sets `tourActive=true`, `tourStep=0` |
| `endTour()` | Sets `tour_seen` in localStorage, deactivates tour |

---

## API Client

`src/api/client.js` exports four functions:

### `analyze(payload)`
`POST /api/analyze` with JSON body. Returns `AnalyzeResponse` promise.

### `analyzeUpload({ file, inputType, options })`
`POST /api/analyze/upload` with `FormData`. Handles binary file uploads. Returns `AnalyzeResponse` promise.

### `analyzeStream(payload, onChunk, onComplete, onError)`
`POST /api/analyze/stream` with JSON body. Reads SSE via `ReadableStream`. Calls `onChunk(data)` for each `findings` event, `onComplete(data)` for the final `complete` event.

### `analyzeUploadStream({ file, inputType, options }, onChunk, onComplete, onError)`
`POST /api/analyze/upload/stream` with `FormData`. Same streaming callbacks as above.

**Base URL resolution:**
```js
const BASE = import.meta.env.VITE_API_BASE_URL || '/api'
```
In development, Vite proxies `/api` to `http://localhost:8000`. In production, set `VITE_API_BASE_URL` to the full backend URL.

---

## Design System

### Color tokens (CSS variables)

| Variable | Dark | Light |
|---|---|---|
| `--bg-primary` | `#0f1117` | `#f8fafc` |
| `--bg-secondary` | `#131720` | `#ffffff` |
| `--bg-border` | `#1e2433` | `#e2e8f0` |
| `--text-primary` | `#e2e8f0` | `#0f172a` |
| `--text-muted` | `#64748b` | `#64748b` |

Theme is applied via `data-theme="dark|light"` on `<html>`. All components use CSS variables, never hardcoded hex values for themed colors.

### Risk color palette

| Level | Hex |
|---|---|
| critical | `#ef4444` (red-500) |
| high | `#f59e0b` (amber-500) |
| medium | `#f97316` (orange-500) |
| low | `#64748b` (slate-500) |

### Typography
- UI: `Inter` (system fallback: `system-ui`)
- Code / log lines: `JetBrains Mono` (fallback: `Courier New`)

### Scrollbar
Custom 4px slim scrollbar via `::-webkit-scrollbar` rules. Transparent track, `var(--bg-border)` thumb.

### Tour spotlight classes
`.tour-highlight` — blue `box-shadow` ring (z-index 9999).
`.tour-overlay` — semi-transparent backdrop (z-index 9998).
`.tour-tooltip` — floating card (z-index 10000).

---

## Features

### Dark / Light mode
Toggle via the sun/moon button in the header. Preference persists across sessions via `localStorage`. All CSS uses variables so every component adapts automatically.

### PDF report generation
Clicking **PDF** in the Analysis panel header generates and downloads a complete security report client-side using jsPDF. The report includes:
- Dark header bar with platform branding and timestamp
- Colored risk banner with score circle
- One-line summary
- Metadata row (input type, time, finding count, risk level)
- Severity breakdown (4 colored boxes)
- Full findings table (risk badge, type, line number, masked value)
- AI insights with numbered bullets
- Page footer with page numbers on every page

No server round-trip. The PDF is generated entirely in the browser.

### Guided tour
Auto-starts on first visit. Replay anytime via the `?` button in the header. Uses a custom spotlight implementation — no external tour library.

### Responsive layout
- **≥ 1024px (lg):** Three-panel flex layout, fixed column widths (288px input, flex-1 viewer, 320px insights)
- **< 1024px:** Single panel with a 3-tab switcher in the header (Input / Log viewer / Analysis)

### Large file handling
Files over 64 KB show a truncated preview in the textarea with a notice banner. The full binary is stored as a `File` object in the Zustand store and sent via `FormData` on analysis. The log viewer shows the preview lines; the backend analyzes the full file.

---

## Local Setup

### Prerequisites
- Node.js 18+
- The backend running at `http://localhost:8000`

### Steps

```bash
# 1. Navigate to frontend directory
cd ai-secure-platform/frontend

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open `http://localhost:5173`.

Vite proxies all `/api/*` requests to `http://localhost:8000` (configured in `vite.config.js`). No separate CORS or env setup needed for local development.

### Build for production

```bash
npm run build
# Output in dist/
```

---

## Deployment

### Render (Static Site)

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

**Environment variables:**

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` |

### Vercel

```bash
npm install -g vercel
vercel --prod
```

Set `VITE_API_BASE_URL` in the Vercel project environment settings.

### Netlify Drop

1. Run `npm run build`
2. Drag the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Set `VITE_API_BASE_URL` in Site settings → Environment variables → Redeploy

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `/api` (proxied) | Full backend URL for production. E.g. `https://logintel-backend.onrender.com/api` |

---

## Project Structure

```
frontend/
│
├── index.html                    # Entry point — sets <title>, loads /src/main.jsx
├── vite.config.js                # Vite config — React plugin, /api proxy
├── tailwind.config.js            # Tailwind — custom colors, animations, font families
├── postcss.config.js             # PostCSS — Tailwind + Autoprefixer
├── package.json
├── .env.example                  # VITE_API_BASE_URL=https://...
├── .gitignore
│
├── public/
│   ├── favicon.svg               # Shield logo SVG
│   └── icons.svg                 # Sprite sheet (social icons)
│
└── src/
    ├── main.jsx                  # React root — mounts <App /> into #root
    ├── index.css                 # CSS variables (dark/light), Tailwind directives,
    │                             # scrollbar, tour overlay styles
    ├── App.jsx                   # Layout shell — header, three-panel / tabbed layout,
    │                             # theme init, tour auto-start
    │
    ├── api/
    │   └── client.js             # analyze(), analyzeUpload(), analyzeStream(),
    │                             # analyzeUploadStream()
    │
    ├── stores/
    │   └── analysisStore.js      # Zustand store with localStorage persistence.
    │                             # Exports: useAnalysisStore, TOUR_STEPS
    │
    ├── components/
    │   ├── InputPanel.jsx        # Left panel — file upload, type selector, options, analyze
    │   ├── LogViewer.jsx         # Center panel — line list, risk highlighting, stream indicator
    │   ├── InsightsPanel.jsx     # Right panel — risk dial, findings, insights, PDF button
    │   ├── RiskBadge.jsx         # Reusable risk pill badge
    │   └── Tour.jsx              # Spotlight tour — overlay, tooltip, step navigation
    │
    └── utils/
        └── generateReport.js     # jsPDF report generator — called by InsightsPanel
```
