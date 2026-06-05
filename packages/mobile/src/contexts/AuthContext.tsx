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
import { doc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

interface UserProfile {
  displayName: string
  photoURL?: string
  points?: number
  totalPointsEarned?: number
  sightingCount?: number
  protectedPostCount?: number
  bestInfoCount?: number
  discoveryCount?: number
  selectedTitle?: string
  titles?: string[]
  badges?: string[]
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
    const timeout = setTimeout(() => setLoading(false), 8000)
    let profileUnsub: (() => void) | null = null

    let authUnsub = () => {}
    try {
      authUnsub = onAuthStateChanged(auth, (u) => {
        clearTimeout(timeout)
        setUser(u)

        if (profileUnsub) { profileUnsub(); profileUnsub = null }

        if (u) {
          // onSnapshot でユーザードキュメントをリアルタイム購読
          // → ポイント・称号・バッジが更新されると即座に反映される
          profileUnsub = onSnapshot(
            doc(db, 'users', u.uid),
            (snap) => {
              if (snap.exists()) {
                const data = snap.data()
                setProfile({
                  displayName: (data.displayName as string) ?? u.displayName ?? '',
                  photoURL: (data.photoURL as string | undefined) ?? u.photoURL ?? undefined,
                  points: (data.points as number) ?? 0,
                  totalPointsEarned: (data.totalPointsEarned as number) ?? 0,
                  sightingCount: (data.sightingCount as number) ?? 0,
                  protectedPostCount: (data.protectedPostCount as number) ?? 0,
                  bestInfoCount: (data.bestInfoCount as number) ?? 0,
                  discoveryCount: (data.discoveryCount as number) ?? 0,
                  selectedTitle: data.selectedTitle as string | undefined,
                  titles: (data.titles as string[]) ?? [],
                  badges: (data.badges as string[]) ?? [],
                })
              } else {
                setProfile({
                  displayName: u.displayName ?? '',
                  photoURL: u.photoURL ?? undefined,
                })
              }
              setLoading(false)
            },
            () => {
              setProfile({ displayName: u.displayName ?? '', photoURL: u.photoURL ?? undefined })
              setLoading(false)
            }
          )
        } else {
          setProfile(null)
          setLoading(false)
        }
      })
    } catch (e) {
      clearTimeout(timeout)
      setLoading(false)
      console.error('onAuthStateChanged error:', e)
    }

    return () => {
      authUnsub()
      if (profileUnsub) profileUnsub()
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
