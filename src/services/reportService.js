const STORAGE_KEY = 'pausa_reports'

export const REPORT_REASONS = [
  { value: 'harassment',    label: 'Beleidigung / Harassment' },
  { value: 'spam',          label: 'Spam' },
  { value: 'inappropriate', label: 'Unangemessener Inhalt' },
  { value: 'cheating',      label: 'Betrug / Cheating' },
  { value: 'impersonation', label: 'Falsches Profil / Imitation' },
  { value: 'other',         label: 'Sonstiges' },
]

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [] }
  catch { return [] }
}

function persist(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

// 24h-Duplikat-Guard: gleicher Reporter + gleiche targetId
export function submitReport({ type, targetId, targetName, reason, detail = '', reportedBy }) {
  const reports = load()
  const recent = reports.find(r =>
    r.type === type &&
    r.targetId === targetId &&
    r.reportedBy === reportedBy &&
    Date.now() - new Date(r.reportedAt).getTime() < 86_400_000
  )
  if (recent) throw new Error('Du hast dieses Ziel bereits gemeldet.')

  const report = {
    reportId:   `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    targetId,
    targetName,
    reason,
    detail:     detail.trim(),
    reportedBy,
    reportedAt: new Date().toISOString(),
  }
  persist([...reports, report])
  return report
}

export function getReports() { return load() }
