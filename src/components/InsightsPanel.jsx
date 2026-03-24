import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnalysisStore } from '../stores/analysisStore'
import RiskBadge from './RiskBadge'
import { generatePDFReport } from '../utils/generateReport'

const MotionCircle = motion.circle
const MotionDiv = motion.div

const RISK_COLOR = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#f97316',
  low:      '#64748b',
}

const SEVERITY_CARD = {
  critical: 'bg-red-500/8 border-red-500/20 text-red-400',
  high:     'bg-amber-500/8 border-amber-500/20 text-amber-400',
  medium:   'bg-orange-500/8 border-orange-500/20 text-orange-400',
  low:      'bg-slate-500/8 border-slate-500/20 text-slate-400',
}

function RiskDial({ score, level }) {
  const max = 20
  const pct = Math.min(score / max, 1)
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = RISK_COLOR[level] || '#64748b'

  return (
    <div className="flex flex-col items-center py-5">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 90 90" className="w-24 h-24 -rotate-90">
          <circle cx="45" cy="45" r={r} fill="none"
            stroke="#1e2433" strokeWidth="7" />
          <MotionCircle cx="45" cy="45" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-[10px] text-slate-600">/ {max}</span>
        </div>
      </div>
      <div className={`mt-2 px-4 py-1 rounded-full text-[11px] font-bold tracking-widest
        border ${SEVERITY_CARD[level]}`}>
        {(level || 'none').toUpperCase()}
      </div>
    </div>
  )
}

export default function InsightsPanel() {
  const { result, lastCompletedResult, streamFindings, isStreaming, isLoading, error, content, inputType } = useAnalysisStore()
  const [showAllFindings, setShowAllFindings] = useState(false)

  const activeResult = result || lastCompletedResult

  const findings = activeResult?.findings || streamFindings
  const insights = activeResult?.insights || []
  const summary  = activeResult?.summary  || ''
  const score    = activeResult?.risk_score ?? 0
  const level    = activeResult?.risk_level ?? 'low'
  const action   = activeResult?.action

  const counts = useMemo(() => ({
    critical: findings.filter(f => f.risk === 'critical').length,
    high:     findings.filter(f => f.risk === 'high').length,
    medium:   findings.filter(f => f.risk === 'medium').length,
    low:      findings.filter(f => f.risk === 'low').length,
  }), [findings])

  const hasData = findings.length > 0 || activeResult
  const visibleFindings = showAllFindings ? findings : findings.slice(0, 150)
  const isResultRetained = !result && !!lastCompletedResult && (isStreaming || isLoading)

  const handleDownload = () => {
    if (!activeResult) return
    generatePDFReport(activeResult, inputType, content)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {/* Header */}
<div className="px-5 py-4 border-b flex items-center gap-2 shrink-0"
  style={{ borderColor: 'var(--bg-border)' }}>
  <span className="w-2 h-2 rounded-full bg-red-400" />
  <span className="text-[11px] font-semibold tracking-widest uppercase"
    style={{ color: 'var(--text-muted)' }}>
    Analysis
  </span>

  {action && (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border
      ${action === 'blocked' ? 'text-red-400 border-red-500/30 bg-red-500/10'
      : action === 'masked'  ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>
      {action.toUpperCase()}
    </span>
  )}

  {/* Download button — only shows when results are ready */}
  {result && (
    <button
      onClick={handleDownload}
      title="Download PDF report"
      className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
        text-[11px] font-medium transition-all duration-150
        bg-blue-500/10 hover:bg-blue-500/20 text-blue-400
        border border-blue-500/20 hover:border-blue-500/40"
    >
      <svg width="12" height="12" fill="none" stroke="currentColor"
        viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      PDF
    </button>
  )}
</div>
      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        {error && (
          <div className="m-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {isResultRetained && (
          <div className="m-4 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-[11px] text-blue-300">
            Showing the last completed analysis while the new run is processing.
          </div>
        )}

        {/* Empty state */}
        {!hasData && !error && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-700 px-6">
            <div className="w-12 h-12 rounded-xl bg-bg-secondary border border-bg-border
              flex items-center justify-center mb-3">
              <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm text-center">Results will appear here after analysis</p>
          </div>
        )}

        {hasData && (
          <>
            {/* Risk dial */}
            <RiskDial score={score} level={level} />

            {/* Summary */}
            {summary && (
              <div className="mx-4 mb-4 p-3 rounded-lg bg-bg-secondary border border-bg-border">
                <p className="text-[11px] text-slate-400 leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Severity counts */}
            <div className="grid grid-cols-4 gap-2 px-4 mb-4">
              {['critical','high','medium','low'].map(r => (
                <div key={r}
                  className={`rounded-lg border p-2 text-center ${SEVERITY_CARD[r]}`}>
                  <div className="text-lg font-bold">{counts[r]}</div>
                  <div className="text-[9px] font-semibold tracking-widest uppercase opacity-60">
                    {r}
                  </div>
                </div>
              ))}
            </div>

            {/* Findings */}
            {findings.length > 0 && (
              <div className="px-4 mb-4">
                <h3 className="text-[10px] font-semibold tracking-widest uppercase
                  text-slate-600 mb-2">
                  Findings ({findings.length})
                </h3>
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {visibleFindings.map((f, i) => (
                      <MotionDiv key={`${f.line}-${f.type}-${i}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="bg-bg-secondary border border-bg-border rounded-lg p-2.5"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <RiskBadge level={f.risk} />
                          <span className="text-[12px] font-medium text-slate-200">
                            {f.type}
                          </span>
                          <span className="ml-auto text-[10px] text-slate-600">
                            line {f.line + 1}
                          </span>
                        </div>
                        {f.value && (
                          <p className="text-[11px] font-mono text-slate-500 break-all">
                            {f.value}
                          </p>
                        )}
                      </MotionDiv>
                    ))}
                  </AnimatePresence>
                </div>
                {findings.length > visibleFindings.length && (
                  <div className="pt-3 text-center">
                    <button
                      onClick={() => setShowAllFindings(true)}
                      className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-[11px] text-blue-300 transition-colors hover:bg-blue-500/10"
                    >
                      Show all {findings.length} findings
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI Insights */}
            {insights.length > 0 && (
              <div className="px-4 pb-6">
                <h3 className="text-[10px] font-semibold tracking-widest uppercase
                  text-slate-600 mb-2">
                  AI Insights
                </h3>
                <div className="space-y-0">
                  {insights.map((insight, i) => (
                    <MotionDiv key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-3 py-2.5 border-b border-bg-border last:border-none"
                    >
                      <span className="shrink-0 w-5 h-5 rounded-full bg-bg-border
                        text-slate-600 text-[10px] font-bold flex items-center
                        justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-[12px] text-slate-400 leading-relaxed">{insight}</p>
                    </MotionDiv>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
