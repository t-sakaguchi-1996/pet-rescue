'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { AppNotification } from '@pet-rescue/shared'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

function toNotif(id: string, data: Record<string, unknown>): AppNotification {
  const createdAt = data.createdAt as Timestamp | string
  return {
    id,
    userId: data.userId as string,
    type: data.type as 'comment' | 'reply',
    petId: data.petId as string,
    petName: (data.petName as string) ?? '',
    fromUserId: data.fromUserId as string,
    fromUserDisplayName: (data.fromUserDisplayName as string) ?? '匿名',
    isRead: Boolean(data.isRead),
    createdAt:
      createdAt instanceof Timestamp
        ? createdAt.toDate().toISOString()
        : (createdAt ?? ''),
  }
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    const fullQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
    const fallbackQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(30)
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
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            )
          })
        }
      }
    )
    return () => unsub()
  }, [user])

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  if (!user) return null

  const unread = notifications.filter((n) => !n.isRead).length

  const handleClick = async (n: AppNotification) => {
    setOpen(false)
    if (!n.isRead) await updateDoc(doc(db, 'notifications', n.id), { isRead: true })
  }

  const markAllRead = async () => {
    await Promise.all(
      notifications.filter((n) => !n.isRead).map((n) =>
        updateDoc(doc(db, 'notifications', n.id), { isRead: true })
      )
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-400 hover:text-primary-500 transition-colors rounded-full hover:bg-primary-50"
        aria-label={`通知${unread > 0 ? `（未読${unread}件）` : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 bg-primary-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        /* モバイルで画面幅を超えないよう right-0 + max-w で制御 */
        <div className="absolute right-0 top-11 w-[min(320px,calc(100vw-2rem))] bg-white rounded-3xl shadow-[0_8px_40px_rgba(232,84,122,0.15)] border border-pink-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-pink-50">
            <span className="font-bold text-sm text-gray-800">🔔 通知</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-500 hover:text-primary-600 font-semibold">
                すべて既読
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-2xl mb-1">🔕</p>
                <p className="text-sm text-gray-400">通知はありません</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={`/posts/${n.petId}`}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-pink-50 hover:bg-primary-50 transition-colors ${
                    !n.isRead ? 'bg-primary-50/60' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-500">
                    {n.fromUserDisplayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">
                      <span className="font-semibold">{n.fromUserDisplayName}</span>
                      {n.type === 'comment' ? 'さんがコメント' : 'さんが返信'}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{n.petName}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {format(new Date(n.createdAt), 'M/d H:mm', { locale: ja })}
                    </p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
