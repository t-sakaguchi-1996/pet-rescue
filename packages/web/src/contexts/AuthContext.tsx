'use client'

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
  signOut,
  updateProfile,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { User } from '@pet-rescue/shared'
import { linkGuestActivityAndGrantPoints } from '@/lib/points'

interface AuthContextValue {
  user: FirebaseUser | null
  profile: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (displayName: string) => Promise<void>
  updateUserPhotoURL: (photoURL: string) => Promise<void>
  updateUserEmail: (newEmail: string, currentPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) {
          const data = snap.data()
          setProfile({
            id: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: data.displayName ?? '',
            photoURL: data.photoURL,
            fcmTokens: data.fcmTokens ?? [],
            notificationRadius: data.notificationRadius ?? 10,
            notificationLocation: data.notificationLocation,
            points: (data.points as number) ?? 0,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
          })
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName,
      fcmTokens: [],
      notificationRadius: 10,
      points: 0,
      createdAt: Timestamp.now(),
    })

    // 同じメールアドレスの未ログイン投稿・コメントを紐づけてポイントを付与
    try {
      await linkGuestActivityAndGrantPoints(cred.user.uid, email)
    } catch {
      // 紐づけ失敗は登録自体に影響させない
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const updateUserProfile = async (displayName: string) => {
    if (!auth.currentUser) throw new Error('Not authenticated')
    await updateProfile(auth.currentUser, { displayName })
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName })
    setProfile((prev) => (prev ? { ...prev, displayName } : null))
  }

  const updateUserPhotoURL = async (photoURL: string) => {
    if (!auth.currentUser) throw new Error('Not authenticated')
    await updateProfile(auth.currentUser, { photoURL })
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { photoURL })
    setProfile((prev) => (prev ? { ...prev, photoURL } : null))
    setUser({ ...auth.currentUser } as typeof auth.currentUser)
  }

  const updateUserEmail = async (
    newEmail: string,
    currentPassword: string
  ) => {
    const currentUser = auth.currentUser
    if (!currentUser || !currentUser.email) throw new Error('Not authenticated')
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    )
    await reauthenticateWithCredential(currentUser, credential)
    await verifyBeforeUpdateEmail(currentUser, newEmail)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
        updateUserPhotoURL,
        updateUserEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
