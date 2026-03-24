const BASE = '/api'

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
        } catch (_) {}
      }
    }
  } catch (e) {
    onError(e.message)
  }
}