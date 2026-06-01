import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadPetImage(
  userId: string,
  file: File
): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`
  const storageRef = ref(storage, `pets/${userId}/${fileName}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function uploadPetImages(
  userId: string,
  files: File[]
): Promise<string[]> {
  return Promise.all(files.map((f) => uploadPetImage(userId, f)))
}

export async function deletePetImage(url: string): Promise<void> {
  const storageRef = ref(storage, url)
  await deleteObject(storageRef)
}

export async function uploadAvatarImage(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storageRef = ref(storage, `avatars/${userId}/profile.${ext}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
