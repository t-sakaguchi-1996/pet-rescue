'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import {
  createComment,
  createGuestComment,
  deleteComment,
  subscribeComments,
  uploadCommentImage,
  fetchUserProfiles,
  selectBestInfo,
  markBestInfoPointGranted,
  type UserProfile,
} from '@/lib/comments'
import { grantBestCommentPoints } from '@/lib/points'
import { notifyBestInfoSelected } from '@/lib/notifications'
import type { Comment } from '@pet-rescue/shared'

interface Props {
  petId: string
  petOwnerId: string
  petName: string
}

export default function CommentSection({ petId, petOwnerId, petName }: Props) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map())

  const currentUserPhotoURL = profile?.photoURL ?? user?.photoURL ?? undefined
  const isPetOwner = user?.uid === petOwnerId

  useEffect(() => {
    return subscribeComments(petId, setComments)
  }, [petId])

  useEffect(() => {
    if (comments.length === 0) return
    const ids = [...new Set(comments.map((c) => c.userId).filter(Boolean))] as string[]
    fetchUserProfiles(ids).then(setUserProfiles)
  }, [comments])

  const topLevel = comments.filter((c) => !c.parentId)
  const repliesFor = (id: string) => comments.filter((c) => c.parentId === id)

  const getThreadId = (commentId: string): string => {
    const c = comments.find((x) => x.id === commentId)
    if (!c || !c.parentId) return commentId
    return c.parentId
  }

  const threadId = replyingToId ? getThreadId(replyingToId) : null
  const replyTarget = replyingToId ? comments.find((c) => c.id === replyingToId) : null
  const mentionName = replyTarget?.parentId ? replyTarget.userDisplayName : undefined

  const toggleReply = (commentId: string) => {
    setReplyingToId((prev) => (prev === commentId ? null : commentId))
  }

  const handleSelectBestInfo = async (comment: Comment) => {
    if (!isPetOwner) return

    const isGuest = !comment.userId
    const confirmMsg = isGuest
      ? `このコメントを「最有力情報」に選びますか？\n\n※この操作は取り消せません。\n※投稿者が会員登録した際に +100pt が付与されます。`
      : `「${comment.userDisplayName}」のコメントを「最有力情報」に選びますか？\n\n※この操作は取り消せません。\nコメント投稿者に +100pt を付与します。`

    if (!window.confirm(confirmMsg)) return

    try {
      const authorUserId = await selectBestInfo(petId, comment.id)
      // ログイン済みユーザーのコメントなら即ポイント付与＆通知
      if (authorUserId && !comment.bestInfoPointGranted) {
        await grantBestCommentPoints(authorUserId, comment.id)
        await markBestInfoPointGranted(petId, comment.id)
      }
      // 最有力情報選択を投稿者に通知（ログイン済みの場合のみ）
      if (authorUserId) {
        await notifyBestInfoSelected({
          recipientUserId: authorUserId,
          petId,
          petName,
          amount: 100,
        })
      }
    } catch (err) {
      console.error('最有力情報の選択に失敗しました', err)
    }
  }

  return (
    <section className="mt-8 border-t pt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-5">
        コメント
        <span className="ml-2 text-sm font-normal text-gray-400">
          ({comments.length})
        </span>
      </h2>

      {isPetOwner && (
        <div className="mb-5 p-3 rounded-xl text-xs" style={{ background: '#FFF3DC', border: '1px solid #FFD98A' }}>
          <span className="font-bold" style={{ color: '#7A4500' }}>投稿者メモ:</span>
          <span className="ml-1" style={{ color: '#8B6340' }}>
            最も有力な情報のコメントに「最有力情報」を選ぶと、コメント投稿者に +100pt 付与されます。
          </span>
        </div>
      )}

      {topLevel.length === 0 && (
        <p className="text-gray-400 text-sm mb-6">
          コメントはまだありません。情報をお持ちの方はコメントしてください。
        </p>
      )}

      <div className="space-y-5 mb-8">
        {topLevel.map((comment) => {
          const replies = repliesFor(comment.id)
          const isFormHere = threadId === comment.id

          return (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={user?.uid}
                currentUserPhotoURL={currentUserPhotoURL}
                userProfiles={userProfiles}
                petId={petId}
                isPetOwner={isPetOwner}
                isReplyActive={replyingToId === comment.id}
                onReply={() => toggleReply(comment.id)}
                onSelectBestInfo={() => handleSelectBestInfo(comment)}
              />

              {(replies.length > 0 || isFormHere) && (
                <div className="ml-10 mt-3 space-y-3">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={user?.uid}
                      currentUserPhotoURL={currentUserPhotoURL}
                      userProfiles={userProfiles}
                      petId={petId}
                      isPetOwner={false}
                      isReplyActive={replyingToId === reply.id}
                      onReply={() => toggleReply(reply.id)}
                      onSelectBestInfo={() => handleSelectBestInfo(reply)}
                    />
                  ))}

                  {isFormHere && user && (
                    <CommentForm
                      petId={petId}
                      petOwnerId={petOwnerId}
                      petName={petName}
                      parentId={comment.id}
                      parentUserId={replyTarget?.userId}
                      mentionName={mentionName}
                      onSubmit={() => setReplyingToId(null)}
                      onCancel={() => setReplyingToId(null)}
                      compact
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {user ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            コメントを追加
          </h3>
          <CommentForm
            petId={petId}
            petOwnerId={petOwnerId}
            petName={petName}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 bg-amber-50 rounded-xl p-4"
               style={{ border: '1px solid #FFD98A' }}>
            <p className="font-bold mb-1" style={{ color: '#7A4500' }}>
              💬 未登録でもコメントできます
            </p>
            <p className="text-xs" style={{ color: '#8B6340' }}>
              メールアドレスを入力してコメントしてください。後から会員登録して、「最有力情報」に選ばれた場合のポイントも受け取れます。
            </p>
          </div>
          <GuestCommentForm
            petId={petId}
            petOwnerId={petOwnerId}
            petName={petName}
          />
          <p className="text-xs text-center text-gray-400">
            または{' '}
            <a href="/auth/login" className="underline" style={{ color: '#C46B00' }}>
              ログイン
            </a>
            {' '}/{' '}
            <a href="/auth/register" className="underline" style={{ color: '#C46B00' }}>
              新規登録
            </a>
          </p>
        </div>
      )}
    </section>
  )
}

function CommentItem({
  comment,
  currentUserId,
  currentUserPhotoURL,
  userProfiles,
  petId,
  isPetOwner,
  onReply,
  isReplyActive,
  onSelectBestInfo,
}: {
  comment: Comment
  currentUserId?: string
  currentUserPhotoURL?: string
  userProfiles: Map<string, UserProfile>
  petId: string
  isPetOwner: boolean
  onReply: () => void
  isReplyActive: boolean
  onSelectBestInfo: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [settingBest, setSettingBest] = useState(false)
  const isOwn = currentUserId && comment.userId ? currentUserId === comment.userId : false
  const canReply = Boolean(currentUserId)
  const isGuest = !comment.userId

  const photoURL = isOwn
    ? currentUserPhotoURL
    : (userProfiles.get(comment.userId ?? '')?.photoURL ?? comment.userPhotoURL)
  const avatarLetter = (comment.userDisplayName.charAt(0) || '?').toUpperCase()

  const handleDelete = async () => {
    if (!confirm('このコメントを削除しますか？')) return
    setDeleting(true)
    try {
      await deleteComment(petId, comment.id)
    } catch {
      setDeleting(false)
    }
  }

  const handleBestInfo = async () => {
    setSettingBest(true)
    try {
      onSelectBestInfo()
    } finally {
      setSettingBest(false)
    }
  }

  return (
    <div className={`flex gap-3 ${comment.isBestInfo ? 'relative' : ''}`}>
      {comment.isBestInfo && (
        <div className="absolute -inset-2 rounded-2xl pointer-events-none"
             style={{ background: 'rgba(255,201,107,0.15)', border: '1.5px solid #FFC96B' }} />
      )}
      <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold relative z-10"
           style={{ background: isGuest ? '#F0F0F0' : '#FFE0A0', color: '#7A4500' }}>
        {photoURL ? (
          <Image src={photoURL} alt={comment.userDisplayName} width={32} height={32} className="object-cover w-full h-full" />
        ) : (
          avatarLetter
        )}
      </div>

      <div className="flex-1 min-w-0 relative z-10">
        <div className="rounded-2xl px-4 py-3" style={{ background: '#FFFAF0', border: '1.5px solid #FFE8B0' }}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold" style={{ color: '#5A3A1A' }}>
              {comment.userDisplayName}
            </span>
            {isGuest && (
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: '#F0F0F0', color: '#888' }}>
                未登録
              </span>
            )}
            {comment.isBestInfo && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#FFC96B', color: '#3D2400' }}>
                ⭐ 最有力情報
              </span>
            )}
            <span className="text-xs" style={{ color: '#C8A070' }}>
              {format(new Date(comment.createdAt), 'M/d H:mm', { locale: ja })}
            </span>
          </div>
          <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: '#3D2400' }}>
            {comment.text}
          </p>
          {comment.imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {comment.imageUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                   className="relative w-24 h-24 rounded-lg overflow-hidden block">
                  <Image src={url} alt={`添付画像 ${i + 1}`} fill sizes="96px"
                         className="object-cover hover:opacity-90 transition-opacity" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 ml-1">
          {canReply && (
            <button
              onClick={onReply}
              className={`text-xs transition-colors ${isReplyActive ? 'text-red-500 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {isReplyActive ? '返信をキャンセル' : '返信'}
            </button>
          )}
          {isOwn && (
            <button onClick={handleDelete} disabled={deleting}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
              削除
            </button>
          )}
          {isPetOwner && !comment.parentId && !comment.isBestInfo && (
            <button
              onClick={handleBestInfo}
              disabled={settingBest}
              className="text-xs font-semibold transition-colors disabled:opacity-50"
              style={{ color: '#9B8060' }}
            >
              {settingBest ? '処理中...' : '⭐ 最有力情報に選ぶ（+100pt付与）'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentForm({
  petId,
  petOwnerId,
  petName,
  parentId,
  parentUserId,
  mentionName,
  onSubmit,
  onCancel,
  compact,
}: {
  petId: string
  petOwnerId: string
  petName: string
  parentId?: string
  parentUserId?: string
  mentionName?: string
  onSubmit?: () => void
  onCancel?: () => void
  compact?: boolean
}) {
  const { user, profile } = useAuth()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (compact) textareaRef.current?.focus()
  }, [compact])

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return
    const remaining = 3 - files.length
    const toAdd = Array.from(selected).slice(0, remaining)
    setFiles((prev) => [...prev, ...toAdd].slice(0, 3))
    toAdd.forEach((f) => {
      const reader = new FileReader()
      reader.onload = (e) =>
        setPreviews((prev) => [...prev, e.target?.result as string].slice(0, 3))
      reader.readAsDataURL(f)
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || (!text.trim() && files.length === 0)) return
    setSubmitting(true)
    setError('')
    try {
      const imageUrls = await Promise.all(files.map(uploadCommentImage))
      await createComment({
        petId,
        petOwnerId,
        petName,
        userId: user.uid,
        userDisplayName: profile?.displayName ?? user.displayName ?? user.email ?? '匿名',
        userPhotoURL: profile?.photoURL ?? user.photoURL ?? undefined,
        text: text.trim(),
        imageUrls,
        parentId,
        parentUserId,
      })
      setText('')
      setFiles([])
      setPreviews([])
      onSubmit?.()
    } catch (err) {
      setError('送信に失敗しました。もう一度お試しください。')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {mentionName && (
        <p className="text-xs text-gray-500 mb-1.5">
          <span className="font-semibold text-red-500">@{mentionName}</span>{' '}に返信
        </p>
      )}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parentId ? '返信を入力...' : '情報をお持ちの場合はコメントしてください...'}
        rows={compact ? 2 : 3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
      />
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {previews.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              <button type="button" onClick={() => removeFile(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex items-center gap-2 mt-2">
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
               onChange={(e) => handleFiles(e.target.files)} />
        {files.length < 3 && (
          <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            画像を追加 ({files.length}/3)
          </button>
        )}
        <div className="flex-1" />
        {onCancel && (
          <button type="button" onClick={onCancel}
                  className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">
            キャンセル
          </button>
        )}
        <button type="submit" disabled={submitting || (!text.trim() && files.length === 0)}
                className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? '送信中...' : parentId ? '返信する' : 'コメントする'}
        </button>
      </div>
    </form>
  )
}

function GuestCommentForm({
  petId,
  petOwnerId,
  petName,
}: {
  petId: string
  petOwnerId: string
  petName: string
}) {
  const [text, setText] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) { setError('コメントを入力してください'); return }
    if (!guestEmail.trim()) { setError('メールアドレスを入力してください'); return }

    setSubmitting(true)
    setError('')
    try {
      let temporaryId = localStorage.getItem('animal_go_temp_id') ?? ''
      if (!temporaryId) {
        temporaryId = crypto.randomUUID()
        localStorage.setItem('animal_go_temp_id', temporaryId)
      }

      await createGuestComment({
        petId,
        petOwnerId,
        petName,
        guestEmail: guestEmail.trim(),
        temporaryId,
        text: text.trim(),
        imageUrls: [],
      })

      setSubmitted(true)
    } catch (err) {
      setError('送信に失敗しました。もう一度お試しください。')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 rounded-xl text-sm" style={{ background: '#F0FFF4', border: '1px solid #9ADFC0' }}>
        <p className="font-bold mb-1" style={{ color: '#1A7A3C' }}>✓ コメントを送信しました</p>
        <p className="text-xs" style={{ color: '#2AAA6E' }}>
          このコメントが「最有力情報」に選ばれた場合、同じメールアドレスで会員登録することで +100pt を受け取れます。
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          className="input-field"
          placeholder="メールアドレス（必須）"
          required
        />
        <p className="text-xs mt-1" style={{ color: '#9B8060' }}>
          非公開・ポイント受け取り時のみ使用
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="情報をお持ちの場合はコメントしてください..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
        required
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={submitting || !text.trim() || !guestEmail.trim()}
              className="btn-primary w-full text-sm disabled:opacity-50">
        {submitting ? '送信中...' : 'コメントする'}
      </button>
    </form>
  )
}
