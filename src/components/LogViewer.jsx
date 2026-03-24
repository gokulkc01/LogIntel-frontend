import { useMemo, useRef, useEffect, useState } from 'react'
import { useAnalysisStore } from '../stores/analysisStore'
import RiskBadge from './RiskBadge'

const RISK_ROW_BG = {
  critical: 'bg-red-500/10 border-l-2 border-red-500/50',
  high:     'bg-amber-500/8 border-l-2 border-amber-500/40',
  medium:   'bg-orange-500/8 border-l-2 border-orange-500/30',
}

function highlightText(text, value) {
  if (!value || value === '[REDACTED]') return text
  try {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
    return parts.map((p, i) =>
      p.toLowerCase() === value.toLowerCase()
        ? <mark key={i} className="bg-red-500/25 text-red-300 rounded px-0.5 not-italic">{p}</mark>
        : p
    )
  } catch {
    return text
  }
}

function LogLine({ lineNum, text, finding }) {
  const risk = finding?.risk
  return (
    <div className={`flex items-start gap-0 font-mono text-[11.5px] leading-relaxed
      ${RISK_ROW_BG[risk] || ''} pl-1 pr-3 animate-fade-in`}>
      <span className="min-w-[36px] text-slate-700 text-[10px] pt-[3px] pl-2 select-none shrink-0">
        {lineNum}
      </span>
      <span className="flex-1 text-slate-300 break-all py-[2px]">
        {finding?.value && finding.value !== '[REDACTED]'
          ? highlightText(text, finding.value)
          : text}
      </span>
      {risk && (
        <span className="shrink-0 ml-2 pt-[3px]">
          <RiskBadge level={risk} label={finding.type} />
        </span>
      )}
    </div>
  )
}

export default function LogViewer() {
  const {
    content, result,
    isStreaming, streamFindings,
    streamProgress, streamComplete,
  } = useAnalysisStore()

  const bottomRef = useRef(null)
  const [showAll, setShowAll] = useState(false)

  const lines = useMemo(() => {
    if (!content) return []
    return content.split('\n').filter(l => l.trim())
  }, [content])

  const findings = result?.findings || streamFindings

  const findingsByLine = useMemo(() => {
    const map = {}
    findings.forEach(f => {
      const order = ['critical','high','medium','low']
      if (!map[f.line] || order.indexOf(f.risk) < order.indexOf(map[f.line].risk)) {
        map[f.line] = f
      }
    })
    return map
  }, [findings])

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamFindings.length, isStreaming])

  const PREVIEW_LIMIT = 200
  const displayLines = showAll ? lines : lines.slice(0, PREVIEW_LIMIT)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
          Log viewer
        </span>
        <span className="ml-auto text-[10px] text-slate-600">
          {lines.length} lines · {findings.length} findings
        </span>
      </div>

      {/* Stream indicator */}
      {(isStreaming || streamComplete) && (
        <div className="mx-4 mt-3 shrink-0 flex items-center gap-2 px-3 py-2
          bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isStreaming ? 'bg-emerald-400 animate-pulse-dot' : 'bg-slate-500'
          }`} />
          <span className="text-[11px] text-emerald-400 font-medium">
            {isStreaming
              ? `Streaming · chunk ${streamProgress.chunk} / ${streamProgress.total || '?'}`
              : `Complete · ${findings.length} findings detected`}
          </span>
        </div>
      )}

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto mt-2 pb-4">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-700 pb-16">
            <svg className="w-10 h-10 mb-3 opacity-30" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                   a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Upload or paste content to analyze</p>
          </div>
        ) : (
          <>
            {displayLines.map((text, i) => (
              <LogLine
                key={i}
                lineNum={i + 1}
                text={text}
                finding={findingsByLine[i]}
              />
            ))}

            {lines.length > PREVIEW_LIMIT && !showAll && (
              <div className="text-center py-4">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300
                    border border-blue-500/20 px-4 py-1.5 rounded-lg
                    bg-blue-500/5 transition-colors"
                >
                  Show all {lines.length} lines
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  )
}