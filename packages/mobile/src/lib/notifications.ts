import messaging from '@react-native-firebase/messaging'
import * as Notifications from 'expo-notifications'
import firestore from '@react-native-firebase/firestore'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function requestNotificationPermission(
  userId: string
): Promise<boolean> {
  const authStatus = await messaging().requestPermission()
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL

  if (enabled) {
    const token = await messaging().getToken()
    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        fcmTokens: firestore.FieldValue.arrayUnion(token),
      })
  }

  return enabled
}

export function setupMessageHandlers(
  onMessage: (payload: {
    notification?: { title?: string; body?: string }
    data?: Record<string, string>
  }) => void
) {
  const unsubscribeForeground = messaging().onMessage(onMessage)

  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification?.title ?? 'ペット救助',
        body: remoteMessage.notification?.body ?? '新しいペット情報があります',
        data: remoteMessage.data,
      },
      trigger: null,
    })
  })

  return unsubscribeForeground
}
