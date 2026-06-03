import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from './firebase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestNotificationPermission(
  userId: string
): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('実機でのみプッシュ通知が使用できます')
    return false
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return false

  const { data: token } = await Notifications.getExpoPushTokenAsync()

  if (token && userId) {
    await updateDoc(doc(db, 'users', userId), {
      expoPushTokens: arrayUnion(token),
    })
  }

  return true
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler)
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler)
}
