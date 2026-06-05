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
  sendEmailVerification,
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
  updateSelectedTitle: (titleId: string | null) => Promise<void>
  updateShowInRanking: (show: boolean) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (firebaseUser: FirebaseUser) => {
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
        totalPointsEarned: (data.totalPointsEarned as number) ?? 0,
        showInRanking: data.showInRanking !== false,
        isBanned: Boolean(data.isBanned),
        selectedTitle: data.selectedTitle as string | undefined,
        titles: (data.titles as string[]) ?? [],
        badges: (data.badges as string[]) ?? [],
        sightingCount: (data.sightingCount as number) ?? 0,
        protectedPostCount: (data.protectedPostCount as number) ?? 0,
        bestInfoCount: (data.bestInfoCount as number) ?? 0,
        discoveryCount: (data.discoveryCount as number) ?? 0,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
      })
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await loadProfile(firebaseUser)
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
    await sendEmailVerification(cred.user)
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName,
      fcmTokens: [],
      notificationRadius: 10,
      points: 0,
      totalPointsEarned: 0,
      showInRanking: true,
      titles: [],
      badges: [],
      sightingCount: 0,
      protectedPostCount: 0,
      bestInfoCount: 0,
      discoveryCount: 0,
      createdAt: Timestamp.now(),
    })

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

  const updateSelectedTitle = async (titleId: string | null) => {
    if (!auth.currentUser) throw new Error('Not authenticated')
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      selectedTitle: titleId ?? null,
    })
    setProfile((prev) => (prev ? { ...prev, selectedTitle: titleId ?? undefined } : null))
  }

  const updateShowInRanking = async (show: boolean) => {
    if (!auth.currentUser) throw new Error('Not authenticated')
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { showInRanking: show })
    setProfile((prev) => (prev ? { ...prev, showInRanking: show } : null))
  }

  const refreshProfile = async () => {
    if (auth.currentUser) await loadProfile(auth.currentUser)
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
        updateSelectedTitle,
        updateShowInRanking,
        refreshProfile,
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
