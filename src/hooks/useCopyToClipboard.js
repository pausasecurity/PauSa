import { useState, useCallback, useEffect, useRef } from 'react'

export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      if (timerRef.current) clearTimeout(timerRef.current)
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), resetMs)
    } catch {}
  }, [resetMs])

  return [copied, copy]
}
