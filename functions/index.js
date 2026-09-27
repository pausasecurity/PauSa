'use strict'

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret }       = require('firebase-functions/params')
const admin                  = require('firebase-admin')
const nodemailer             = require('nodemailer')

admin.initializeApp()
const db = admin.firestore()

const mailUser = defineSecret('MAIL_USER')
const mailPass = defineSecret('MAIL_PASS')

exports.checkLoginLocation = onCall(
  { region: 'europe-west3', secrets: [mailUser, mailPass] },
  async (request) => {
    const { userId, email, ip, city, country } = request.data ?? {}

    if (!userId || !email || !ip) {
      throw new HttpsError('invalid-argument', 'Fehlende Felder.')
    }

    const ref  = db.collection('loginHistory').doc(userId)
    const snap = await ref.get()
    const prev = snap.exists ? snap.data() : null

    const now     = Date.now()
    const newData = { ip, city, country, email, loginAt: now }
    await ref.set(newData)

    // Erster Login oder gleiche IP → kein Alert
    if (!prev || prev.ip === ip) return { alerted: false }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: mailUser.value(), pass: mailPass.value() },
    })

    const date = new Date(now).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })

    await transporter.sendMail({
      from:    `"PauSa Security" <${mailUser.value()}>`,
      to:      email,
      subject: 'Neuer Login von unbekanntem Standort – PauSa',
      html:    buildEmailHtml({ city, country, ip, date, prevCity: prev.city, prevCountry: prev.country }),
    })

    return { alerted: true }
  }
)

function buildEmailHtml({ city, country, ip, date, prevCity, prevCountry }) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neuer Login erkannt</title>
</head>
<body style="margin:0;padding:0;background:#0D0D1A;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D1A;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#13132A;border-radius:12px;overflow:hidden;border:1px solid #2a2a4a;">

          <!-- Header -->
          <tr>
            <td style="background:#6C47FF;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px;">PauSa</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Sicherheitsbenachrichtigung</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#fff;">
                Neuer Login erkannt
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#9999bb;line-height:1.6;">
                Wir haben einen Login in dein PauSa-Konto von einem neuen Standort festgestellt.
                Falls du das warst, musst du nichts tun.
              </p>

              <!-- New login box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a35;border:1px solid #ff4d4d44;border-radius:8px;margin-bottom:16px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#ff6b6b;letter-spacing:1px;text-transform:uppercase;">Neuer Login</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#9999bb;padding-bottom:6px;width:100px;">Standort</td>
                        <td style="font-size:13px;color:#fff;font-weight:500;padding-bottom:6px;">${city}, ${country}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#9999bb;padding-bottom:6px;">IP-Adresse</td>
                        <td style="font-size:13px;color:#fff;font-weight:500;padding-bottom:6px;">${ip}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#9999bb;">Zeitpunkt</td>
                        <td style="font-size:13px;color:#fff;font-weight:500;">${date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Previous login box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a35;border:1px solid #2a2a4a;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#6C47FF;letter-spacing:1px;text-transform:uppercase;">Letzter bekannter Standort</p>
                    <p style="margin:0;font-size:13px;color:#9999bb;">${prevCity ?? 'Unbekannt'}, ${prevCountry ?? 'Unbekannt'}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#9999bb;line-height:1.6;">
                Falls du diesen Login <strong style="color:#ff6b6b;">nicht selbst</strong> durchgeführt hast,
                ändere sofort dein Passwort und kontaktiere uns.
              </p>

              <a href="https://pau-sa.web.app" style="display:inline-block;background:#6C47FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
                Passwort jetzt ändern
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #2a2a4a;">
              <p style="margin:0;font-size:12px;color:#555577;line-height:1.5;">
                Diese E-Mail wurde automatisch von PauSa generiert. Bitte nicht antworten.<br>
                &copy; ${new Date().getFullYear()} PauSa
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
