import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { useAnalysisStore } from '../stores/analysisStore'
import { analyze, analyzeStream } from '../api/client'

const INPUT_TYPES = [
  { id: 'log',  label: 'Log file' },
  { id: 'text', label: 'Text' },
  { id: 'file', label: 'PDF / Doc' },
  { id: 'sql',  label: 'SQL' },
  { id: 'chat', label: 'Chat' },
]

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
        on ? 'bg-blue-500' : 'bg-bg-border'
      }`}
    >
      <span className={`
        absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full
        transition-transform duration-200 ${on ? 'translate-x-[14px]' : ''}
      `} />
    </button>
  )
}

export default function InputPanel() {
  const {
    inputType, setInputType,
    content, setContent,
    filename, setFilename,
    options, setOption,
    isLoading, isStreaming,
    startStream, appendStreamFindings,
    setStreamProgress, finalizeStream,
    setLoading, setResult, setError, reset,
  } = useAnalysisStore()

  const onDrop = useCallback((accepted) => {
    const file = accepted[0]
    if (!file) return
    setFilename(file.name)
    const ext = file.name.split('.').pop().toLowerCase()
    if (['log', 'txt'].includes(ext)) setInputType('log')
    else if (['pdf'].includes(ext)) setInputType('file')
    else if (['doc', 'docx'].includes(ext)) setInputType('file')

    const reader = new FileReader()
    reader.onload = (e) => setContent(e.target.result)
    if (['pdf', 'doc', 'docx'].includes(ext)) {
      reader.readAsDataURL(file)
    } else {
      reader.readAsText(file, 'utf-8')
    }
  }, [setContent, setFilename, setInputType])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'text/plain': ['.log', '.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    }
  })

  const handleAnalyze = async () => {
    if (!content.trim()) return
    reset()

    const payload = {
      input_type: inputType,
      content,
      filename: filename || undefined,
      options: {
        mask: options.mask,
        block_high_risk: options.block_high_risk,
        log_analysis: options.log_analysis,
      }
    }

    if (options.streaming) {
      startStream()
      await analyzeStream(
        payload,
        (chunk) => {
          if (chunk.findings) appendStreamFindings(chunk.findings)
          if (chunk.chunk) setStreamProgress(chunk.chunk, chunk.total_chunks)
        },
        (final) => finalizeStream(final),
        (err) => setError(err)
      )
    } else {
      setLoading(true)
      try {
        const result = await analyze(payload)
        setResult(result)
      } catch (e) {
        setError(e.message)
      }
    }
  }

  const busy = isLoading || isStreaming

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
          Input
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Input type selector */}
        
        <div id="type-selector" className="grid grid-cols-3 gap-1.5">
          {INPUT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setInputType(t.id)}
              className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-all duration-150 border ${
                inputType === t.id
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                  : 'bg-bg-secondary border-bg-border text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer
            transition-all duration-200 ${
            isDragActive
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-bg-border bg-bg-secondary hover:border-slate-600'
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-8 h-8 mx-auto mb-3 rounded-lg bg-bg-border flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          {filename ? (
            <p className="text-xs text-blue-400 font-medium">{filename}</p>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                <span className="text-blue-400 font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-[10px] text-slate-600 mt-1">.log · .txt · .pdf · .doc — max 10MB</p>
            </>
          )}
        </div>

        {/* Paste area */}
        <div>
          <label className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 block mb-2">
            Or paste content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Paste ${inputType} content here...`}
            className="w-full h-32 bg-bg-secondary border border-bg-border rounded-lg p-3
              text-[11px] font-mono text-slate-300 placeholder-slate-700
              resize-none focus:outline-none focus:border-blue-500/50
              transition-colors duration-150"
          />
        </div>

        {/* Options */}
        
        <div id = "options-panel" className="space-y-0 border border-bg-border rounded-lg overflow-hidden">
          {[
            { key: 'mask',            label: 'Mask sensitive values' },
            { key: 'block_high_risk', label: 'Block high risk content' },
            { key: 'log_analysis',    label: 'Deep log analysis' },
            { key: 'streaming',       label: 'Real-time streaming' },
          ].map(({ key, label }, i, arr) => (
            <div
              key={key}
              className={`flex items-center justify-between px-3 py-2.5 bg-bg-secondary
                ${i < arr.length - 1 ? 'border-b border-bg-border' : ''}`}
            >
              <span className="text-[12px] text-slate-400">{label}</span>
              <Toggle
                on={options[key]}
                onToggle={() => setOption(key, !options[key])}
              />
            </div>

          ))}
        </div>
      </div>

      {/* Analyze button */}
      <div className="p-4 border-t border-bg-border">
        <motion.button
          onClick={handleAnalyze}
          disabled={busy || !content.trim()}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold tracking-wide
            transition-all duration-200 ${
            busy || !content.trim()
              ? 'bg-bg-border text-slate-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-400 text-white'
          }`}
        >
          {isStreaming ? 'Streaming...' : isLoading ? 'Analyzing...' : 'Analyze'}
        </motion.button>
      </div>
    </div>
  )
}