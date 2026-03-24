import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { useAnalysisStore } from '../stores/analysisStore'
import { analyze, analyzeStream, analyzeUpload, analyzeUploadStream } from '../api/client'

const MotionButton = motion.button
const PREVIEW_BYTES = 64 * 1024

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
    selectedFile, setSelectedFile,
    requiresFileReselect,
    contentPreviewTruncated, setContentPreviewTruncated,
    clearSelectedFile,
    filename, setFilename,
    options, setOption,
    isLoading, isStreaming,
    startStream, appendStreamFindings,
    setStreamProgress, finalizeStream,
    setLoading, setResult, setError, reset, restartAnalysis,
  } = useAnalysisStore()

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0]
    if (!file) return
    setSelectedFile(file)
    setFilename(file.name)
    const ext = file.name.split('.').pop().toLowerCase()
    if (['log', 'txt'].includes(ext)) setInputType('log')
    else if (['pdf'].includes(ext)) setInputType('file')
    else if (['doc', 'docx'].includes(ext)) setInputType('file')

    if (['pdf', 'doc', 'docx'].includes(ext)) {
      setContent(`[Binary document selected: ${file.name}]`)
      setContentPreviewTruncated(false)
      return
    }

    const previewText = await file.slice(0, PREVIEW_BYTES).text()
    const hasMore = file.size > PREVIEW_BYTES
    setContentPreviewTruncated(hasMore)
    setContent(hasMore
      ? `${previewText}\n\n[Preview truncated. Full file will be uploaded to the backend for analysis.]`
      : previewText)
  }, [setContent, setContentPreviewTruncated, setFilename, setInputType, setSelectedFile])

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
    if (!content.trim() && !selectedFile) return
    reset()

    const requestOptions = {
      mask: options.mask,
      block_high_risk: options.block_high_risk,
      log_analysis: options.log_analysis,
    }

    if (options.streaming) {
      startStream()
      if (selectedFile) {
        await analyzeUploadStream(
          { file: selectedFile, inputType, options: requestOptions },
          (chunk) => {
            if (chunk.findings) appendStreamFindings(chunk.findings)
            if (chunk.chunk) setStreamProgress(chunk.chunk, chunk.total_chunks)
          },
          (final) => finalizeStream(final),
          (err) => setError(err)
        )
      } else {
        await analyzeStream(
          {
            input_type: inputType,
            content,
            filename: filename || undefined,
            options: requestOptions,
          },
          (chunk) => {
            if (chunk.findings) appendStreamFindings(chunk.findings)
            if (chunk.chunk) setStreamProgress(chunk.chunk, chunk.total_chunks)
          },
          (final) => finalizeStream(final),
          (err) => setError(err)
        )
      }
    } else {
      setLoading(true)
      try {
        const result = selectedFile
          ? await analyzeUpload({ file: selectedFile, inputType, options: requestOptions })
          : await analyze({
              input_type: inputType,
              content,
              filename: filename || undefined,
              options: requestOptions,
            })
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

        {selectedFile && contentPreviewTruncated && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-300">
            Large file preview loaded. Only a small preview is shown in the UI; the full file will be sent directly to the backend during analysis.
          </div>
        )}

        {requiresFileReselect && !selectedFile && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
            The browser was refreshed, so the previously selected file cannot be restored automatically. Re-select the file to analyze it again.
          </div>
        )}

        {selectedFile && (
          <div className="flex items-center justify-between rounded-lg border border-bg-border bg-bg-secondary px-3 py-2">
            <div className="min-w-0 pr-3">
              <p className="truncate text-[12px] font-medium text-slate-300">{filename}</p>
              <p className="text-[10px] text-slate-600">Uploaded file ready for analysis</p>
            </div>
            <button
              onClick={clearSelectedFile}
              className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            >
              Remove file
            </button>
          </div>
        )}

        {/* Paste area */}
        <div>
          <label className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 block mb-2">
            Or paste content
          </label>
          <textarea
            value={content}
            onChange={(e) => {
              clearSelectedFile()
              setContent(e.target.value)
            }}
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
        <div className="flex gap-2">
          <button
            onClick={restartAnalysis}
            disabled={busy}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-[12px] font-semibold transition-all duration-200 ${
              busy
                ? 'border-bg-border text-slate-600 cursor-not-allowed'
                : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100'
            }`}
          >
            Restart
          </button>
          <MotionButton
            onClick={handleAnalyze}
            disabled={busy || (!content.trim() && !selectedFile)}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold tracking-wide
              transition-all duration-200 ${
              busy || (!content.trim() && !selectedFile)
                ? 'bg-bg-border text-slate-600 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-400 text-white'
            }`}
          >
            {isStreaming ? 'Streaming...' : isLoading ? 'Analyzing...' : 'Analyze'}
          </MotionButton>
        </div>
      </div>
    </div>
  )
}
