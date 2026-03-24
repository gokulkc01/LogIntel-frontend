import { create } from 'zustand'

export const useAnalysisStore = create((set, get) => ({
  // ── Theme ──
  theme: localStorage.getItem('theme') || 'dark',
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),

  // ── Tour ──
  tourActive: false,
  tourStep: 0,
  startTour: () => set({ tourActive: true, tourStep: 0 }),
  nextTourStep: () => set((s) => {
    const next = s.tourStep + 1
    if (next >= TOUR_STEPS.length) return { tourActive: false, tourStep: 0 }
    return { tourStep: next }
  }),
  endTour: () => {
    localStorage.setItem('tour_seen', '1')
    set({ tourActive: false, tourStep: 0 })
  },

  // ── Result state ──
  result: null,
  isLoading: false,
  error: null,

  // ── Stream state ──
  isStreaming: false,
  streamFindings: [],
  streamProgress: { chunk: 0, total: 0 },
  streamComplete: false,

  // ── Input state ──
  inputType: 'log',
  content: '',
  filename: '',
  options: {
    mask: true,
    block_high_risk: false,
    log_analysis: true,
    streaming: true,
  },

  // ── Actions ──
  setInputType: (t) => set({ inputType: t }),
  setContent:   (c) => set({ content: c }),
  setFilename:  (f) => set({ filename: f }),
  setOption: (key, val) =>
    set((s) => ({ options: { ...s.options, [key]: val } })),
  setLoading: (v) => set({ isLoading: v }),
  setError:   (e) => set({ error: e }),
  setResult:  (r) => set({ result: r, isLoading: false, error: null }),
  startStream: () => set({
    isStreaming: true,
    streamFindings: [],
    streamProgress: { chunk: 0, total: 0 },
    streamComplete: false,
    result: null,
    error: null,
  }),
  appendStreamFindings: (findings) =>
    set((s) => ({ streamFindings: [...s.streamFindings, ...findings] })),
  setStreamProgress: (chunk, total) =>
    set({ streamProgress: { chunk, total } }),
  finalizeStream: (summary) =>
    set({ isStreaming: false, streamComplete: true, result: summary }),
  reset: () => set({
    result: null, isLoading: false, error: null,
    isStreaming: false, streamFindings: [],
    streamProgress: { chunk: 0, total: 0 }, streamComplete: false,
  }),
}))

export const TOUR_STEPS = [
  {
    target: 'input-panel',
    title: 'Input panel',
    body: 'Upload a log file via drag & drop, or paste raw content. Choose from 5 input types — log, text, PDF, SQL, or chat.',
    position: 'right',
  },
  {
    target: 'type-selector',
    title: 'Input type selector',
    body: 'Switch between Log File, Text, PDF/Doc, SQL, and Chat modes. Each mode uses a different parser optimized for that format.',
    position: 'right',
  },
  {
    target: 'options-panel',
    title: 'Analysis options',
    body: 'Mask hides sensitive values in the output. Block high risk returns a 403 if critical findings are detected. Real-time streaming shows findings as they are detected.',
    position: 'right',
  },
  {
    target: 'log-viewer',
    title: 'Log viewer',
    body: 'Every line is displayed with its line number. Lines with findings are color-highlighted — red for critical, amber for high, orange for medium. The matched value is underlined inline.',
    position: 'center',
  },
  {
    target: 'insights-panel',
    title: 'Analysis results',
    body: 'The risk dial shows your overall score out of 20. Findings are listed with type, risk level, and line number. AI-generated insights explain each finding and recommend actions.',
    position: 'left',
  },
]