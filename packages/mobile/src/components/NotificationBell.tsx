import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native'
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'expo-router'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AppNotification } from '../types'

function toNotif(id: string, data: Record<string, unknown>): AppNotification {
  const createdAt = data.createdAt
  return {
    id,
    userId: data.userId as string,
    type: data.type as AppNotification['type'],
    petId: (data.petId as string) ?? '',
    petName: (data.petName as string) ?? '',
    fromUserId: data.fromUserId as string | undefined,
    fromUserDisplayName: (data.fromUserDisplayName as string) ?? '',
    sightingId: data.sightingId as string | undefined,
    amount: data.amount as number | undefined,
    rewardName: data.rewardName as string | undefined,
    isRead: Boolean(data.isRead),
    createdAt:
      createdAt instanceof Timestamp
        ? createdAt.toDate().toISOString()
        : typeof createdAt === 'string'
          ? createdAt
          : '',
  }
}

function notifLabel(n: AppNotification): string {
  switch (n.type) {
    case 'comment':
      return `${n.fromUserDisplayName}さんがコメントしました`
    case 'reply':
      return `${n.fromUserDisplayName}さんが返信しました`
    case 'sighting_nearby':
      return '近くで目撃情報がありました！'
    case 'found_nearby':
      return '近くで保護情報が投稿されました'
    case 'prefecture_sighting':
      return '県内で目撃情報がありました！'
    case 'best_info_selected':
      return n.amount
        ? `あなたの情報が最有力情報に選ばれました！ +${n.amount}pt`
        : 'あなたの情報が最有力情報に選ばれました！'
    case 'points_granted':
      return n.amount ? `ポイントが付与されました！ +${n.amount}pt` : 'ポイントが付与されました！'
    case 'discovery_bonus':
      return n.amount ? `発見ボーナス！ +${n.amount}pt` : '発見・保護に貢献しました！'
    case 'reward_exchange_requested':
      return `「${n.rewardName ?? '景品'}」の申請がありました`
    default:
      return 'お知らせがあります'
  }
}

function notifIcon(type: AppNotification['type']): string {
  switch (type) {
    case 'sighting_nearby': return '👁️'
    case 'found_nearby': return '🤝'
    case 'prefecture_sighting': return '📍'
    case 'reply': return '↩️'
    case 'best_info_selected': return '⭐'
    case 'points_granted': return '🎉'
    case 'discovery_bonus': return '🎉'
    case 'reward_exchange_requested': return '🎁'
    default: return '💬'
  }
}

function notifRoute(n: AppNotification): string {
  if (n.type === 'reward_exchange_requested') return '/(tabs)/profile'
  if (
    n.sightingId &&
    (n.type === 'sighting_nearby' ||
      n.type === 'prefecture_sighting' ||
      n.type === 'best_info_selected' ||
      n.type === 'points_granted' ||
      n.type === 'discovery_bonus')
  ) {
    return `/sightings/${n.sightingId}`
  }
  if (n.petId) return `/pet/${n.petId}`
  return '/(tabs)/profile'
}

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!user) return
    const fullQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30),
    )
    const fallbackQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(30),
    )
    let unsub = onSnapshot(
      fullQ,
      (snap) => setNotifications(snap.docs.map((d) => toNotif(d.id, d.data()))),
      (err) => {
        if (err.code === 'failed-precondition') {
          unsub = onSnapshot(fallbackQ, (snap) => {
            setNotifications(
              snap.docs
                .map((d) => toNotif(d.id, d.data()))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            )
          })
        }
      },
    )
    unsubRef.current = unsub
    return () => unsub()
  }, [user])

  if (!user) return null

  const unread = notifications.filter((n) => !n.isRead).length

  const handleTap = async (n: AppNotification) => {
    setOpen(false)
    if (!n.isRead) {
      await updateDoc(doc(db, 'notifications', n.id), { isRead: true }).catch(() => {})
    }
    router.push(notifRoute(n) as never)
  }

  const markAllRead = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.isRead)
        .map((n) => updateDoc(doc(db, 'notifications', n.id), { isRead: true }).catch(() => {})),
    )
  }

  return (
    <>
      <TouchableOpacity style={styles.bellBtn} onPress={() => setOpen(true)}>
        <Text style={styles.bellIcon}>🔔</Text>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={() => {}}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>🔔 通知</Text>
              {unread > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={styles.markAllText}>すべて既読</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🔕</Text>
                  <Text style={styles.emptyText}>通知はありません</Text>
                </View>
              ) : (
                notifications.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.item, !n.isRead && styles.itemUnread]}
                    onPress={() => handleTap(n)}
                  >
                    <View style={styles.itemIcon}>
                      <Text style={styles.itemIconText}>{notifIcon(n.type)}</Text>
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemLabel} numberOfLines={2}>
                        {notifLabel(n)}
                      </Text>
                      {n.petName ? (
                        <Text style={styles.itemPet} numberOfLines={1}>{n.petName}</Text>
                      ) : null}
                      {n.createdAt ? (
                        <Text style={styles.itemDate}>
                          {format(new Date(n.createdAt), 'M/d H:mm', { locale: ja })}
                        </Text>
                      ) : null}
                    </View>
                    {!n.isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  bellBtn: { position: 'relative', padding: 6, marginRight: 2 },
  bellIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 8,
  },
  panel: {
    width: 320,
    maxHeight: 440,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF0D8',
  },
  panelTitle: { fontSize: 14, fontWeight: 'bold', color: '#3D2400' },
  markAllText: { fontSize: 12, color: '#C46B00', fontWeight: '600' },

  list: { maxHeight: 360 },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#9ca3af' },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF8EE',
    gap: 10,
  },
  itemUnread: { backgroundColor: '#FFFBF2' },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF0D8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemIconText: { fontSize: 16 },
  itemBody: { flex: 1 },
  itemLabel: { fontSize: 12, color: '#374151', lineHeight: 17 },
  itemPet: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  itemDate: { fontSize: 10, color: '#d1d5db', marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C46B00',
    marginTop: 4,
    flexShrink: 0,
  },
})
