import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'
import type { Comment } from '@pet-rescue/shared'

const PETS = 'pets'
const COMMENTS = 'comments'
const NOTIFICATIONS = 'notifications'

function toComment(id: string, data: Record<string, unknown>): Comment {
  const createdAt = data.createdAt as Timestamp | string
  const updatedAt = data.updatedAt as Timestamp | string
  return {
    id,
    petId: data.petId as string,
    userId: (data.userId as string | undefined) ?? undefined,
    guestEmail: data.guestEmail as string | undefined,
    temporaryId: data.temporaryId as string | undefined,
    userDisplayName: (data.userDisplayName as string) ?? '未登録ユーザー',
    userPhotoURL: data.userPhotoURL as string | undefined,
    text: (data.text as string) ?? '',
    imageUrls: (data.imageUrls as string[]) ?? [],
    parentId: data.parentId as string | undefined,
    isBestInfo: Boolean(data.isBestInfo),
    bestInfoPointGranted: Boolean(data.bestInfoPointGranted),
    createdAt:
      createdAt instanceof Timestamp
        ? createdAt.toDate().toISOString()
        : (createdAt ?? ''),
    updatedAt:
      updatedAt instanceof Timestamp
        ? updatedAt.toDate().toISOString()
        : (updatedAt ?? ''),
  }
}

export function subscribeComments(
  petId: string,
  callback: (comments: Comment[]) => void
): Unsubscribe {
  const orderedQ = query(
    collection(db, PETS, petId, COMMENTS),
    orderBy('createdAt', 'asc')
  )
  const fallbackQ = query(collection(db, PETS, petId, COMMENTS))

  let unsubscribe = onSnapshot(
    orderedQ,
    (snap) => callback(snap.docs.map((d) => toComment(d.id, d.data()))),
    (err) => {
      if (err.code === 'failed-precondition') {
        unsubscribe = onSnapshot(fallbackQ, (snap) => {
          const sorted = snap.docs
            .map((d) => toComment(d.id, d.data()))
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
          callback(sorted)
        })
      }
    }
  )

  return () => unsubscribe()
}

export async function uploadCommentImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `comments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/** ログイン済みユーザーのコメント作成 */
export async function createComment(params: {
  petId: string
  petOwnerId: string
  petName: string
  userId: string
  userDisplayName: string
  userPhotoURL?: string
  text: string
  imageUrls: string[]
  parentId?: string
  parentUserId?: string
}): Promise<void> {
  const now = Timestamp.now()
  const commentData: Record<string, unknown> = {
    petId: params.petId,
    userId: params.userId,
    userDisplayName: params.userDisplayName,
    text: params.text,
    imageUrls: params.imageUrls,
    isBestInfo: false,
    bestInfoPointGranted: false,
    createdAt: now,
    updatedAt: now,
  }
  if (params.userPhotoURL) commentData.userPhotoURL = params.userPhotoURL
  if (params.parentId) commentData.parentId = params.parentId

  await addDoc(collection(db, PETS, params.petId, COMMENTS), commentData)

  if (params.petOwnerId !== params.userId) {
    await addDoc(collection(db, NOTIFICATIONS), {
      userId: params.petOwnerId,
      type: params.parentId ? 'reply' : 'comment',
      petId: params.petId,
      petName: params.petName,
      fromUserId: params.userId,
      fromUserDisplayName: params.userDisplayName,
      isRead: false,
      createdAt: now,
    })
  }

  if (
    params.parentId &&
    params.parentUserId &&
    params.parentUserId !== params.userId &&
    params.parentUserId !== params.petOwnerId
  ) {
    await addDoc(collection(db, NOTIFICATIONS), {
      userId: params.parentUserId,
      type: 'reply',
      petId: params.petId,
      petName: params.petName,
      fromUserId: params.userId,
      fromUserDisplayName: params.userDisplayName,
      isRead: false,
      createdAt: now,
    })
  }
}

/** 未ログインユーザーのコメント作成（guestEmail + temporaryId 必須） */
export async function createGuestComment(params: {
  petId: string
  petOwnerId: string
  petName: string
  guestEmail: string
  temporaryId: string
  text: string
  imageUrls: string[]
  parentId?: string
}): Promise<void> {
  const now = Timestamp.now()
  const commentData: Record<string, unknown> = {
    petId: params.petId,
    userId: null,
    guestEmail: params.guestEmail,
    temporaryId: params.temporaryId,
    userDisplayName: '未登録ユーザー',
    text: params.text,
    imageUrls: params.imageUrls,
    isBestInfo: false,
    bestInfoPointGranted: false,
    createdAt: now,
    updatedAt: now,
  }
  if (params.parentId) commentData.parentId = params.parentId

  await addDoc(collection(db, PETS, params.petId, COMMENTS), commentData)
}

/** ペット投稿者がコメントを「最有力情報」に選択 */
export async function selectBestInfo(
  petId: string,
  commentId: string
): Promise<string | undefined> {
  const commentRef = doc(db, PETS, petId, COMMENTS, commentId)
  const snap = await getDoc(commentRef)
  if (!snap.exists()) return undefined

  const data = snap.data()
  await updateDoc(commentRef, {
    isBestInfo: true,
    updatedAt: Timestamp.now(),
  })

  return data.userId as string | undefined
}

/** 最有力情報のポイント付与済みフラグをセット */
export async function markBestInfoPointGranted(
  petId: string,
  commentId: string
): Promise<void> {
  await updateDoc(doc(db, PETS, petId, COMMENTS, commentId), {
    bestInfoPointGranted: true,
    updatedAt: Timestamp.now(),
  })
}

/** 最有力情報の選択を解除 */
export async function unselectBestInfo(petId: string, commentId: string): Promise<void> {
  await updateDoc(doc(db, PETS, petId, COMMENTS, commentId), {
    isBestInfo: false,
    updatedAt: Timestamp.now(),
  })
}

export async function deleteComment(
  petId: string,
  commentId: string
): Promise<void> {
  await deleteDoc(doc(db, PETS, petId, COMMENTS, commentId))
}

export interface UserProfile {
  photoURL?: string
  displayName: string
}

/** 複数ユーザーの最新プロフィールを Firestore から一括取得 */
export async function fetchUserProfiles(
  userIds: string[]
): Promise<Map<string, UserProfile>> {
  const unique = [...new Set(userIds)].filter(Boolean)
  const results = await Promise.all(
    unique.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          const d = snap.data()
          return [uid, {
            photoURL:    (d.photoURL    as string | undefined) ?? undefined,
            displayName: (d.displayName as string)             ?? '',
          }] as const
        }
      } catch { /* ignore */ }
      return [uid, null] as const
    })
  )
  const map = new Map<string, UserProfile>()
  results.forEach(([uid, profile]) => {
    if (profile) map.set(uid, profile)
  })
  return map
}

/** メールアドレスで未ログインコメントを取得（会員登録時の紐づけ用） */
export async function fetchGuestCommentsByEmail(
  email: string
): Promise<(Comment & { petId: string })[]> {
  const snap = await getDocs(
    query(
      collectionGroup(db, COMMENTS),
      where('guestEmail', '==', email),
      where('userId', '==', null)
    )
  )
  return snap.docs.map((d) => {
    const comment = toComment(d.id, d.data())
    const petId = d.ref.parent.parent?.id ?? ''
    return { ...comment, petId }
  })
}

/** 未ログインコメントをユーザーに紐づけ */
export async function linkGuestCommentToUser(
  petId: string,
  commentId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, PETS, petId, COMMENTS, commentId), {
    userId,
    updatedAt: Timestamp.now(),
  })
}
