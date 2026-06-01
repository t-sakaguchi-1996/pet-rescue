import storage from '@react-native-firebase/storage'

export async function uploadPetImage(
  userId: string,
  uri: string
): Promise<string> {
  const fileName = `${Date.now()}_${uri.split('/').pop()}`
  const ref = storage().ref(`pets/${userId}/${fileName}`)
  await ref.putFile(uri)
  return ref.getDownloadURL()
}

export async function uploadPetImages(
  userId: string,
  uris: string[]
): Promise<string[]> {
  return Promise.all(uris.map((uri) => uploadPetImage(userId, uri)))
}
