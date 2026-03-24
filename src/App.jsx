import { useEffect, useState } from 'react'
import { useAnalysisStore } from './stores/analysisStore'
import InputPanel    from './components/InputPanel'
import LogViewer     from './components/LogViewer'
import InsightsPanel from './components/InsightsPanel'
import Tour          from './components/Tour'

const TABS = ['Input', 'Log viewer', 'Analysis']

function SunIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor"
      viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor"
      viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  )
}

export default function App() {
  const { theme, toggleTheme, startTour } = useAnalysisStore()
  const [activeTab, setActiveTab] = useState(0)

  // Apply theme on mount + change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Auto-start tour for first-time visitors
  useEffect(() => {
    const seen = localStorage.getItem('tour_seen')
    if (!seen) {
      setTimeout(() => startTour(), 800)
    }
  }, [startTour])

  const isDark = theme === 'dark'

  const headerBg     = isDark ? '#131720' : '#ffffff'
  const headerBorder = isDark ? '#1e2433' : '#e2e8f0'
  const panelBorder  = isDark ? '#1e2433' : '#e2e8f0'
  const textMuted    = isDark ? '#64748b' : '#94a3b8'
  const appBg        = isDark ? '#0f1117' : '#f8fafc'
  const tabActiveBg  = isDark ? '#1e2433' : '#f1f5f9'

  return (
    <div style={{ background: appBg, color: 'var(--text-primary)' }}
      className="flex flex-col h-screen overflow-hidden">

      {/* ── Top bar ── */}
      <header style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}` }}
        className="flex items-center px-4 h-11 shrink-0 z-50 gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center shrink-0">
            <svg width="14" height="14" fill="none" stroke="white"
              viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="text-[12px] font-semibold tracking-wide hidden sm:block"
            style={{ color: 'var(--text-primary)' }}>
            LogIntel
          </span>
        </div>

        {/* Mobile tab switcher */}
        <div className="flex lg:hidden ml-2 gap-1 bg-bg-tertiary rounded-lg p-0.5"
          style={{ background: tabActiveBg }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)}
              className="text-[10px] font-medium px-2.5 py-1 rounded-md transition-all"
              style={{
                background: activeTab === i ? (isDark ? '#1e3a5f' : '#dbeafe') : 'transparent',
                color: activeTab === i ? '#60a5fa' : textMuted,
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px]"
          style={{ color: textMuted }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Backend connected
        </div>

        {/* Tour button */}
        <button
          onClick={() => startTour()}
          title="Start tour"
          className="w-7 h-7 rounded-lg flex items-center justify-center
            transition-colors text-[12px] font-bold"
          style={{
            background: isDark ? '#1e2433' : '#f1f5f9',
            color: textMuted,
            border: `1px solid ${panelBorder}`,
          }}>
          ?
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: isDark ? '#1e2433' : '#f1f5f9',
            color: textMuted,
            border: `1px solid ${panelBorder}`,
          }}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop: three panels */}
        <div className="hidden lg:flex w-full">
          {/* Left */}
          <div id="input-panel"
            style={{ borderRight: `1px solid ${panelBorder}`, background: 'var(--bg-secondary)' }}
            className="w-72 shrink-0 overflow-hidden flex flex-col">
            <InputPanel />
          </div>

          {/* Middle */}
          <div id="log-viewer"
            style={{ borderRight: `1px solid ${panelBorder}`, background: 'var(--bg-primary)' }}
            className="flex-1 overflow-hidden flex flex-col">
            <LogViewer />
          </div>

          {/* Right */}
          <div id="insights-panel"
            style={{ background: 'var(--bg-secondary)' }}
            className="w-80 shrink-0 overflow-hidden flex flex-col">
            <InsightsPanel />
          </div>
        </div>

        {/* Mobile / tablet: tabbed */}
        <div className="flex lg:hidden w-full overflow-hidden">
          <div id="input-panel"
            style={{ background: 'var(--bg-secondary)' }}
            className={`w-full flex-col overflow-hidden ${activeTab === 0 ? 'flex' : 'hidden'}`}>
            <InputPanel />
          </div>
          <div id="log-viewer"
            style={{ background: 'var(--bg-primary)' }}
            className={`w-full flex-col overflow-hidden ${activeTab === 1 ? 'flex' : 'hidden'}`}>
            <LogViewer />
          </div>
          <div id="insights-panel"
            style={{ background: 'var(--bg-secondary)' }}
            className={`w-full flex-col overflow-hidden ${activeTab === 2 ? 'flex' : 'hidden'}`}>
            <InsightsPanel />
          </div>
        </div>
      </div>

      {/* Tour overlay */}
      <Tour />
    </div>
  )
}
