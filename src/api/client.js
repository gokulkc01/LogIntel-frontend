const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function analyze(payload) {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.reason || err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

function appendFormOptions(formData, options = {}) {
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  })
}

export async function analyzeUpload({ file, inputType, options = {} }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('input_type', inputType)
  appendFormOptions(formData, options)

  const res = await fetch(`${BASE}/analyze/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.reason || err.detail || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function analyzeStream(payload, onChunk, onComplete, onError) {
  try {
    const res = await fetch(`${BASE}/analyze/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() // keep incomplete chunk

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data:')) continue
        try {
          const data = JSON.parse(line.slice(5).trim())
          if (data.done) {
            onComplete(data)
          } else {
            onChunk(data)
          }
        } catch {
          continue
        }
      }
    }
  } catch (e) {
    onError(e.message)
  }
}

export async function analyzeUploadStream({ file, inputType, options = {} }, onChunk, onComplete, onError) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('input_type', inputType)
    appendFormOptions(formData, options)

    const res = await fetch(`${BASE}/analyze/upload/stream`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data:')) continue
        try {
          const data = JSON.parse(line.slice(5).trim())
          if (data.done) {
            onComplete(data)
          } else {
            onChunk(data)
          }
        } catch {
          continue
        }
      }
    }
  } catch (e) {
    onError(e.message)
  }
}
