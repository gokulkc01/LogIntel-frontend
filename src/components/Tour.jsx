import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnalysisStore, TOUR_STEPS } from '../stores/analysisStore'

const MotionDiv = motion.div

function computeTooltipStyle(rect, position, tooltipW, tooltipH) {
  const viewportPadding = 8
  const margin = 14
  const vw = window.innerWidth
  const vh = window.innerHeight
  const safeWidth = Math.min(tooltipW, vw - viewportPadding * 2)
  const safeHeight = Math.min(tooltipH, vh - viewportPadding * 2)

  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%,-50%)',
      width: safeWidth,
      maxHeight: safeHeight,
    }
  }

  let top
  let left
  let transform = ''

  if (position === 'right') {
    left = rect.right + margin
    top  = rect.top + rect.height / 2
    transform = 'translateY(-50%)'
    // Flip left if overflows right edge
    if (left + safeWidth > vw - viewportPadding) {
      left = rect.left - safeWidth - margin
    }
  } else if (position === 'left') {
    left = rect.left - safeWidth - margin
    top  = rect.top + rect.height / 2
    transform = 'translateY(-50%)'
    // Flip right if overflows left edge
    if (left < viewportPadding) {
      left = rect.right + margin
    }
  } else {
    // center / bottom — place below, centered
    left = rect.left + rect.width / 2
    top  = rect.bottom + margin
    transform = 'translateX(-50%)'
    // Flip above if overflows bottom
    if (top + safeHeight > vh - viewportPadding) {
      top = rect.top - safeHeight - margin
    }
  }

  // Clamp to viewport
  left = Math.max(viewportPadding, Math.min(left, vw - safeWidth - viewportPadding))
  top  = Math.max(viewportPadding, Math.min(top,  vh - safeHeight - viewportPadding))

  return { top, left, transform, width: safeWidth, maxHeight: safeHeight }
}

export default function Tour() {
  const { tourActive, tourStep, nextTourStep, endTour } = useAnalysisStore()
  const step = TOUR_STEPS[tourStep]
  const [tooltipStyle, setTooltipStyle] = useState({})
  const tooltipRef = useRef(null)

  useEffect(() => {
    if (!tourActive || !step) return

    const el = document.getElementById(step.target)
    let timeoutId

    const updateTooltipPosition = () => {
      const rect = el?.getBoundingClientRect()
      const tooltipRect = tooltipRef.current?.getBoundingClientRect()
      setTooltipStyle(computeTooltipStyle(
        rect,
        step.position,
        tooltipRect?.width ?? 300,
        tooltipRect?.height ?? 260,
      ))
    }

    // Remove highlight from all elements first
    TOUR_STEPS.forEach(s => {
      document.getElementById(s.target)?.classList.remove('tour-highlight')
    })

    if (el) {
      el.classList.add('tour-highlight')
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

      // Wait for scroll then measure
      timeoutId = window.setTimeout(updateTooltipPosition, 120)
    } else {
      updateTooltipPosition()
    }

    window.addEventListener('resize', updateTooltipPosition)

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      window.removeEventListener('resize', updateTooltipPosition)
      el?.classList.remove('tour-highlight')
    }
  }, [tourActive, tourStep, step])

  // Clean up all highlights when tour ends
  useEffect(() => {
    if (!tourActive) {
      TOUR_STEPS.forEach(s => {
        document.getElementById(s.target)?.classList.remove('tour-highlight')
      })
    }
  }, [tourActive])

  if (!tourActive || !step) return null

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <div
        key="backdrop"
        className="tour-overlay"
        onClick={endTour}
      />

      {/* Tooltip */}
      <MotionDiv
        ref={tooltipRef}
        key={`tooltip-${tourStep}`}
        className="tour-tooltip"
        style={{
          position: 'fixed',
          width: 'min(300px, calc(100vw - 16px))',
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100vh - 16px)',
          overflowY: 'auto',
          ...tooltipStyle,
        }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === tourStep ? 20 : 6,
                background: i === tourStep ? '#3b82f6'
                  : i < tourStep ? '#3b82f680' : 'var(--bg-border)',
              }}
            />
          ))}
          <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {tourStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10
            text-blue-400 border border-blue-500/20 tracking-wider uppercase">
            Step {tourStep + 1}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}>
          {step.title}
        </h3>

        {/* Body */}
        <p className="text-[12px] leading-relaxed mb-5"
          style={{ color: 'var(--text-muted)' }}>
          {step.body}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={endTour}
            className="text-[11px] px-3 py-2 rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              border: '1px solid var(--bg-border)',
              background: 'transparent',
            }}
          >
            Skip
          </button>
          <button
            onClick={nextTourStep}
            className="flex-1 text-[12px] font-semibold px-3 py-2 rounded-lg
              bg-blue-500 hover:bg-blue-400 text-white transition-colors"
          >
            {tourStep === TOUR_STEPS.length - 1 ? 'Done ✓' : 'Next →'}
          </button>
        </div>
      </MotionDiv>
    </AnimatePresence>
  )
}
