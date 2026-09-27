import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyAV1Od_iJUsrWA0nzEbZTmfwGHzDh7wgm0',
  authDomain:        'pau-sa.firebaseapp.com',
  projectId:         'pau-sa',
  storageBucket:     'pau-sa.firebasestorage.app',
  messagingSenderId: '447890357041',
  appId:             '1:447890357041:web:90ff4f4e6ca3704ef14e10',
  measurementId:     'G-G8JBYJ1SJS',
}

const app = initializeApp(firebaseConfig)
export { app }
export const db   = getFirestore(app)
export const auth = getAuth(app)
