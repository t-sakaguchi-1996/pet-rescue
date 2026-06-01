import firestore from '@react-native-firebase/firestore'
import storage from '@react-native-firebase/storage'
import auth from '@react-native-firebase/auth'
import type { Pet, PetFilter } from './firestore'

export { auth, firestore, storage }
export type { Pet, PetFilter }
