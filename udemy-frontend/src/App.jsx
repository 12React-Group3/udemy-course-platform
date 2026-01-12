import './App.css'

import { useEffect, useState } from 'react'

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/hello')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const json = await response.json()
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <h1>Frontend reading backend data</h1>
      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}
      {data ? (
        <div className="card" style={{ textAlign: 'left' }}>
          <div>
            <strong>message:</strong> {data.message}
          </div>
          <div>
            <strong>serverTime:</strong> {data.serverTime}
          </div>
        </div>
      ) : null}
    </>
  )
}

export default App
