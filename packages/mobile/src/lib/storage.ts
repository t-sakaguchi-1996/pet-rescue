import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadPetImage(
  userId: string,
  uri: string
): Promise<string> {
  const fileName = `${Date.now()}_${uri.split('/').pop() ?? 'photo.jpg'}`
  const storageRef = ref(storage, `pets/${userId}/${fileName}`)

  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg'
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'

  const response = await fetch(uri)
  if (!response.ok) throw new Error(`Failed to read image: ${uri}`)
  const blob = await response.blob()

  await uploadBytes(storageRef, blob, { contentType })
  return getDownloadURL(storageRef)
}

export async function uploadPetImages(
  userId: string,
  uris: string[]
): Promise<string[]> {
  return Promise.all(uris.map((uri) => uploadPetImage(userId, uri)))
}
