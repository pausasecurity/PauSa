export async function getLoginLocation() {
  try {
    const res  = await fetch('https://ipapi.co/json/')
    const data = await res.json()
    return {
      ip:      data.ip      ?? 'unknown',
      city:    data.city    ?? 'Unbekannt',
      country: data.country_name ?? 'Unbekannt',
    }
  } catch {
    return { ip: 'unknown', city: 'Unbekannt', country: 'Unbekannt' }
  }
}
