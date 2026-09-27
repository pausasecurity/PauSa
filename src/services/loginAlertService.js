import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './firebase'
import { getLoginLocation } from './locationService'

const functions = getFunctions(app, 'europe-west3')

export async function checkLoginLocation(userId, email) {
  try {
    const location = await getLoginLocation()
    const fn       = httpsCallable(functions, 'checkLoginLocation')
    await fn({ userId, email, ...location })
  } catch (err) {
    console.error('[LoginAlert]', err)
  }
}
