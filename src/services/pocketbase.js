import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090')
pb.autoCancellation(false)

// "Angemeldet bleiben" aus → Auth gilt nur für die Browser-Session
const SESSION_ONLY  = 'pausa_session_only'
const SESSION_ALIVE = 'pausa_session_alive'

export function setSessionOnly(sessionOnly) {
  try {
    if (sessionOnly) {
      localStorage.setItem(SESSION_ONLY, '1')
      sessionStorage.setItem(SESSION_ALIVE, '1')
    } else {
      localStorage.removeItem(SESSION_ONLY)
    }
  } catch {}
}

try {
  if (localStorage.getItem(SESSION_ONLY) === '1' && !sessionStorage.getItem(SESSION_ALIVE)) pb.authStore.clear()
} catch {}
if (!pb.authStore.isValid) pb.authStore.clear()

export function isNotFound(err) {
  return err?.status === 404
}

// Live-Liste: initialer Fetch + Realtime-Events → onChange(records[]). Gibt sync-unsubscribe zurück.
export function subscribeList(collection, { filter = '', sort = '', limit } = {}, onChange) {
  const svc     = pb.collection(collection)
  const records = new Map()
  const pending = []
  let loaded = false
  let closed = false
  let unsub  = null

  const apply = ({ action, record }) => {
    if (action === 'delete') { records.delete(record.id); return }
    const cur = records.get(record.id)
    if (cur?.updated && record.updated && cur.updated > record.updated) return
    records.set(record.id, record)
  }
  const emit = () => { if (!closed) onChange([...records.values()]) }

  svc.subscribe('*', e => {
    if (!loaded) { pending.push(e); return }
    apply(e)
    emit()
  }, filter ? { filter } : undefined)
    .then(fn => { if (closed) fn(); else unsub = fn })
    .catch(err => console.error(`[PB realtime] ${collection}`, err))

  const load = limit
    ? svc.getList(1, limit, { filter, sort }).then(r => r.items)
    : svc.getFullList({ filter, sort })

  load
    .then(items => {
      items.forEach(r => records.set(r.id, r))
      pending.splice(0).forEach(apply)
      loaded = true
      emit()
    })
    .catch(err => console.error(`[PB] ${collection}`, err))

  return () => { closed = true; unsub?.() }
}
