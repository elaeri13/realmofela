import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, update, onValue, off, push, query, limitToLast, runTransaction, orderByChild, equalTo, connectDatabaseEmulator } from 'firebase/database'
import { getAuth, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence, connectAuthEmulator } from 'firebase/auth'
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// 'legacy' (default — how the site works today) or 'secure' (real teacher accounts, server-checked
// student PINs, identity-based database rules). Switched with the VITE_SECURITY_MODE env var in Vercel.
export const SECURITY_MODE = import.meta.env.VITE_SECURITY_MODE === 'secure' ? 'secure' : 'legacy'

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const auth = getAuth(app)
export const functions = getFunctions(app)

// Local testing only: talk to the Firebase emulators instead of the real project.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectDatabaseEmulator(db, '127.0.0.1', 9000)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

// Sign-ins end when the tab/browser closes (shared Chromebooks).
if (SECURITY_MODE === 'secure') setPersistence(auth, browserSessionPersistence).catch(() => {})

export const callFn = (name, data) => httpsCallable(functions, name)(data).then(r => r.data)
export { ref, set, get, update, onValue, off, push, query, limitToLast, runTransaction, orderByChild, equalTo,
         signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword, signOut }
