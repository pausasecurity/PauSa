/// <reference path="../pb_data/types.d.ts" />

// Handler laufen in isolierten Kontexten → Helfer nur per require() innerhalb des Handlers.

routerAdd('POST', '/api/pausa/login-check', (e) => {
  const { buildLoginAlertHtml } = require(`${__hooks}/login_alert_mail.js`)

  const user = e.auth
  const body = e.requestInfo().body || {}
  const ip      = String(body.ip || e.realIP() || 'unknown').slice(0, 64)
  const city    = String(body.city || 'Unbekannt').slice(0, 80)
  const country = String(body.country || 'Unbekannt').slice(0, 80)

  let rec
  let prev = null
  try {
    rec  = $app.findFirstRecordByData('loginHistory', 'user', user.id)
    prev = { ip: rec.getString('ip'), city: rec.getString('city'), country: rec.getString('country') }
  } catch (_) {
    rec = new Record($app.findCollectionByNameOrId('loginHistory'))
    rec.set('user', user.id)
  }

  const now = Date.now()
  rec.set('ip', ip)
  rec.set('city', city)
  rec.set('country', country)
  rec.set('loginAt', now)
  $app.save(rec)

  // Erster Login oder gleiche IP → kein Alert
  if (!prev || prev.ip === ip) return e.json(200, { alerted: false })

  const meta = $app.settings().meta
  const date = new Date(now).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
  try {
    $app.newMailClient().send(new MailerMessage({
      from:    { address: meta.senderAddress, name: 'PauSa Security' },
      to:      [{ address: user.email() }],
      subject: 'Neuer Login von unbekanntem Standort – PauSa',
      html:    buildLoginAlertHtml({
        city, country, ip, date,
        prevCity: prev.city, prevCountry: prev.country, appURL: meta.appURL,
      }),
    }))
  } catch (err) {
    $app.logger().error('login-alert mail failed', 'error', String(err))
    return e.json(200, { alerted: false })
  }
  return e.json(200, { alerted: true })
}, $apis.requireAuth('users'))

// Abgelaufene Lobbys serverseitig löschen (Messages via cascadeDelete)
cronAdd('lobbyCleanup', '*/5 * * * *', () => {
  const now = new Date().toISOString()
  const expired = $app.findRecordsByFilter('lobbies', 'expiresAt <= {:now}', '', 500, 0, { now })
  for (const r of expired) $app.delete(r)
})

// allReadyAt = Serverzeit (ersetzt Firestore serverTimestamp)
onRecordUpdateRequest((e) => {
  const next = e.record.getString('allReadyAt')
  const prev = e.record.original().getString('allReadyAt')
  if (next && !prev) e.record.set('allReadyAt', new Date().toISOString())
  e.next()
}, 'lobbies')
