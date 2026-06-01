import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import auth, {
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'

interface AuthContextValue {
  user: FirebaseAuthTypes.User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    await auth().signInWithEmailAndPassword(email, password)
  }

  const register = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const cred = await auth().createUserWithEmailAndPassword(email, password)
    await cred.user.updateProfile({ displayName })
    await firestore().collection('users').doc(cred.user.uid).set({
      email,
      displayName,
      fcmTokens: [],
      notificationRadius: 10,
      createdAt: firestore.Timestamp.now(),
    })
  }

  const logout = async () => {
    await auth().signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
