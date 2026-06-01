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

    const fullQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
    const fallbackQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(30)
    )

    let unsubscribe = onSnapshot(
      fullQuery,
      (snap) => {
        setNotifications(snap.docs.map((d) => toNotif(d.id, d.data())))
      },
      (err) => {
        if (err.code === 'failed-precondition') {
          // Index still building — fall back to unordered query and sort client-side
          unsubscribe = onSnapshot(fallbackQuery, (snap) => {
            const sorted = snap.docs
              .map((d) => toNotif(d.id, d.data()))
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
            setNotifications(sorted)
          })
        }
      }
    )

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!user) return null

  const unread = notifications.filter((n) => !n.isRead).length

  const handleOpen = async () => {
    setOpen((v) => !v)
  }

  const handleClick = async (n: AppNotification) => {
    setOpen(false)
    if (!n.isRead) {
      await updateDoc(doc(db, 'notifications', n.id), { isRead: true })
    }
  }

  const markAllRead = async () => {
    const promises = notifications
      .filter((n) => !n.isRead)
      .map((n) => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
    await Promise.all(promises)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label={`通知${unread > 0 ? `（未読${unread}件）` : ''}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm text-gray-800">通知</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-red-500 hover:text-red-600"
              >
                すべて既読
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">
                通知はありません
              </p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={`/posts/${n.petId}`}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                    !n.isRead ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-red-500">
                    {n.fromUserDisplayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">
                      <span className="font-medium">{n.fromUserDisplayName}</span>
                      {n.type === 'comment'
                        ? 'さんがコメントしました'
                        : 'さんが返信しました'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {n.petName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(n.createdAt), 'M/d H:mm', { locale: ja })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
