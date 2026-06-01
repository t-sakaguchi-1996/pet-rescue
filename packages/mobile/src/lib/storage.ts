import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import * as FileSystem from 'expo-file-system'
import { storage } from './firebase'

export async function uploadPetImage(
  userId: string,
  uri: string
): Promise<string> {
  const fileName = `${Date.now()}_${uri.split('/').pop() ?? 'photo.jpg'}`
  const storageRef = ref(storage, `pets/${userId}/${fileName}`)

  // ローカルURIをblobに変換してアップロード
  const fileInfo = await FileSystem.getInfoAsync(uri)
  if (!fileInfo.exists) throw new Error(`File not found: ${uri}`)

  const response = await fetch(uri)
  const blob = await response.blob()

  await uploadBytes(storageRef, blob)
  return getDownloadURL(storageRef)
}

export async function uploadPetImages(
  userId: string,
  uris: string[]
): Promise<string[]> {
  return Promise.all(uris.map((uri) => uploadPetImage(userId, uri)))
}
