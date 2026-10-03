import { useCallback, useState } from 'react'

const KEY = 'medscholar.shortlist'

function read(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

/** Saved items live in this browser only. Storage can be blocked, so every access is guarded. */
export function useShortlist() {
  const [saved, setSaved] = useState<Set<string>>(read)

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]))
      } catch {
        /* storage unavailable, keep in memory */
      }
      return next
    })
  }, [])

  return { saved, toggle }
}
