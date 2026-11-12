import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../services/api'

export function useAsync(fn, deps = [], { interval } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true)
    try {
      setData(await fnRef.current())
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false) }, [load, ...deps])
  useEffect(() => {
    if (!interval) return undefined
    const t = setInterval(() => load(true), interval)
    return () => clearInterval(t)
  }, [interval, load])

  const reload = useCallback(() => load(false), [load])
  return { data, loading, error, reload }
}