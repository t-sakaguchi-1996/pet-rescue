import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
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
    userId: data.userId as string,
    userDisplayName: (data.userDisplayName as string) ?? '匿名',
    userPhotoURL: data.userPhotoURL as string | undefined,
    text: (data.text as string) ?? '',
    imageUrls: (data.imageUrls as string[]) ?? [],
    parentId: data.parentId as string | undefined,
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

export async function deleteComment(
  petId: string,
  commentId: string
): Promise<void> {
  await deleteDoc(doc(db, PETS, petId, COMMENTS, commentId))
}
