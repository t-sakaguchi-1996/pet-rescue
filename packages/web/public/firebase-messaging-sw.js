importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// これらの値は環境変数から取得できないため、デプロイ時に差し替えてください
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || '',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '',
  projectId: self.FIREBASE_PROJECT_ID || '',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.FIREBASE_APP_ID || '',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  self.registration.showNotification(title ?? 'ペット救助', {
    body: body ?? '新しいペット情報があります',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    data: payload.data,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const petId = event.notification.data?.petId
  if (petId) {
    event.waitUntil(
      clients.openWindow(`/posts/${petId}`)
    )
  }
})
