import { pb } from './pocketbase'
import { getLoginLocation } from './locationService'

// User-ID + E-Mail ermittelt der Server aus dem Auth-Token
export async function checkLoginLocation() {
  try {
    const location = await getLoginLocation()
    await pb.send('/api/pausa/login-check', { method: 'POST', body: location })
  } catch (err) {
    console.error('[LoginAlert]', err)
  }
}
