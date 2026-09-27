import { createClient } from '@supabase/supabase-js'

// "Angemeldet bleiben" aus → Session nur in sessionStorage
const SESSION_ONLY = 'pausa_session_only'

const authStorage = {
  getItem(key) {
    try { return sessionStorage.getItem(key) ?? localStorage.getItem(key) } catch { return null }
  },
  setItem(key, value) {
    try {
      const sessionOnly = localStorage.getItem(SESSION_ONLY) === '1'
      ;(sessionOnly ? sessionStorage : localStorage).setItem(key, value)
    } catch {}
  },
  removeItem(key) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key) } catch {}
  },
}

export function setSessionOnly(sessionOnly) {
  try {
    if (sessionOnly) localStorage.setItem(SESSION_ONLY, '1')
    else localStorage.removeItem(SESSION_ONLY)
  } catch {}
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v) => typeof v === 'string' && UUID.test(v)

// Wirft bei Fehler; DB-Exceptions (z.B. aus RPCs) haben bereits deutsche Meldungen
export function must({ data, error }) {
  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code, status: error.status })
  }
  return data
}

// Live-Abfrage: fetcher() initial + bei jeder Änderung an einer der Tabellen (debounced).
// Delete-Events sind in Supabase nicht filterbar → Tabellen, bei denen Deletes zählen, ohne Filter angeben.
export function liveQuery(tables, fetcher, callback) {
  let closed = false
  let timer  = null
  let seq    = 0

  const run = async () => {
    const mine = ++seq
    try {
      const data = await fetcher()
      if (!closed && mine === seq) callback(data)
    } catch (err) {
      console.error('[Supabase]', err)
    }
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(run, 100) }

  const channel = supabase.channel(`live:${crypto.randomUUID()}`)
  for (const { table, filter } of tables) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, schedule)
  }
  channel.subscribe(status => { if (status === 'SUBSCRIBED') schedule() })
  run()

  return () => {
    closed = true
    clearTimeout(timer)
    supabase.removeChannel(channel)
  }
}
