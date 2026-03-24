const STYLES = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/20',
  high:     'bg-amber-500/15 text-amber-400 border-amber-500/20',
  medium:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  low:      'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

export default function RiskBadge({ level, label, className = '' }) {
  const text = (label || level || '').toUpperCase()
  return (
    <span className={`
      inline-flex items-center px-1.5 py-0.5 rounded text-[10px]
      font-bold tracking-wider border ${STYLES[level] || STYLES.low} ${className}
    `}>
      {text}
    </span>
  )
}