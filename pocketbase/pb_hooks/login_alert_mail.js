function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildLoginAlertHtml({ city, country, ip, date, prevCity, prevCountry, appURL }) {
  const link = /^https?:\/\//.test(appURL || '') ? esc(appURL) : 'https://pau-sa.web.app'
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
          <tr>
            <td style="background:#6C47FF;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px;">PauSa</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Sicherheitsbenachrichtigung</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#fff;">Neuer Login erkannt</p>
              <p style="margin:0 0 24px;font-size:14px;color:#9999bb;line-height:1.6;">
                Wir haben einen Login in dein PauSa-Konto von einem neuen Standort festgestellt.
                Falls du das warst, musst du nichts tun.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a35;border:1px solid #ff4d4d44;border-radius:8px;margin-bottom:16px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#ff6b6b;letter-spacing:1px;text-transform:uppercase;">Neuer Login</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#9999bb;padding-bottom:6px;width:100px;">Standort</td>
                        <td style="font-size:13px;color:#fff;font-weight:500;padding-bottom:6px;">${esc(city)}, ${esc(country)}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#9999bb;padding-bottom:6px;">IP-Adresse</td>
                        <td style="font-size:13px;color:#fff;font-weight:500;padding-bottom:6px;">${esc(ip)}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#9999bb;">Zeitpunkt</td>
                        <td style="font-size:13px;color:#fff;font-weight:500;">${esc(date)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a35;border:1px solid #2a2a4a;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#6C47FF;letter-spacing:1px;text-transform:uppercase;">Letzter bekannter Standort</p>
                    <p style="margin:0;font-size:13px;color:#9999bb;">${esc(prevCity || 'Unbekannt')}, ${esc(prevCountry || 'Unbekannt')}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:14px;color:#9999bb;line-height:1.6;">
                Falls du diesen Login <strong style="color:#ff6b6b;">nicht selbst</strong> durchgeführt hast,
                ändere sofort dein Passwort und kontaktiere uns.
              </p>
              <a href="${link}" style="display:inline-block;background:#6C47FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
                Passwort jetzt ändern
              </a>
            </td>
          </tr>
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

module.exports = { buildLoginAlertHtml }
