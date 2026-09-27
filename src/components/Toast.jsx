import React, { useEffect } from 'react'

const STYLES = {
  success: 'border-brand-accent/50 bg-brand-accent/10 text-brand-accent',
  error:   'border-red-500/50 bg-red-900/20 text-red-400',
  info:    'border-brand-primary/50 bg-brand-primary/10 text-purple-300',
}

const ICONS = { success: '✓', error: '✕', info: 'ℹ' }

export default function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className={`fixed bottom-24 right-6 z-[200] flex items-center gap-3 border rounded-xl px-4 py-3 shadow-2xl shadow-black/40 text-sm font-semibold animate-fade-in ${STYLES[type] ?? STYLES.info}`}>
      <span className="text-base">{ICONS[type]}</span>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-50 hover:opacity-100 text-xs">✕</button>
    </div>
  )
}
