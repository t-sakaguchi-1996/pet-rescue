import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

interface UserProfile {
  displayName: string
  photoURL?: string
}

interface AuthContextValue {
  user: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Firebase Auth 応答がない場合の 8秒フォールバック
    const timeout = setTimeout(() => setLoading(false), 8000)

    let unsub = () => {}
    try {
      unsub = onAuthStateChanged(auth, async (u) => {
        clearTimeout(timeout)
        setUser(u)

        if (u) {
          // Firestore から最新プロフィールを取得（photoURL 同期のため）
          try {
            const snap = await getDoc(doc(db, 'users', u.uid))
            if (snap.exists()) {
              const data = snap.data()
              setProfile({
                displayName: (data.displayName as string) ?? u.displayName ?? '',
                photoURL: (data.photoURL as string | undefined) ?? u.photoURL ?? undefined,
              })
            } else {
              setProfile({
                displayName: u.displayName ?? '',
                photoURL: u.photoURL ?? undefined,
              })
            }
          } catch {
            setProfile({
              displayName: u.displayName ?? '',
              photoURL: u.photoURL ?? undefined,
            })
          }
        } else {
          setProfile(null)
        }

        setLoading(false)
      })
    } catch (e) {
      clearTimeout(timeout)
      setLoading(false)
      console.error('onAuthStateChanged error:', e)
    }

    return () => {
      unsub()
      clearTimeout(timeout)
    }
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    await sendEmailVerification(cred.user)
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName,
      fcmTokens: [],
      expoPushTokens: [],
      notificationRadius: 10,
      createdAt: Timestamp.now(),
    })
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
