import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

// Zwei-Stufen-Bestätigung – inline, kein Modal-Overlay
// variant: 'danger' (rot) | 'warning' (amber für Datenänderungen)
export default function DoubleConfirm({
  text,
  text2 = 'Diese Aktion kann nicht rückgängig gemacht werden. Bist du absolut sicher?',
  confirmLabel = 'Ja, bestätigen',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'danger',
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)

  const c = variant === 'warning'
    ? { wrap: 'bg-yellow-900/10 border-yellow-700/40', msg: 'text-yellow-300', btn: 'bg-yellow-700/70 hover:bg-yellow-600' }
    : { wrap: 'bg-red-900/10 border-red-800/40',    msg: 'text-red-300',    btn: 'bg-red-700/60 hover:bg-red-700'  }

  return (
    <div className={`flex flex-col gap-2 border rounded-lg px-4 py-3 ${c.wrap}`}>
      <p className={`text-sm font-semibold ${c.msg}`}>{step === 1 ? text : text2}</p>
      <div className="flex gap-2">
        <button
          onClick={step === 1 ? () => setStep(2) : onConfirm}
          disabled={loading}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${c.btn}`}
        >
          {loading ? '…' : step === 1 ? t('confirm.continueBtn') : confirmLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
