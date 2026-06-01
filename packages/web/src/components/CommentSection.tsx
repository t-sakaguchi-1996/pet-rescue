'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import {
  createComment,
  deleteComment,
  subscribeComments,
  uploadCommentImage,
} from '@/lib/comments'
import type { Comment } from '@pet-rescue/shared'

interface Props {
  petId: string
  petOwnerId: string
  petName: string
}

export default function CommentSection({ petId, petOwnerId, petName }: Props) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  // ID of the comment we clicked "返信" on (top-level or reply)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)

  // 自分のコメントは常に最新の画像を表示
  const currentUserPhotoURL = profile?.photoURL ?? user?.photoURL ?? undefined

  useEffect(() => {
    return subscribeComments(petId, setComments)
  }, [petId])

  const topLevel = comments.filter((c) => !c.parentId)
  const repliesFor = (id: string) => comments.filter((c) => c.parentId === id)

  // Since threading is flat (all replies use the top-level comment's ID as parentId),
  // we resolve the thread root to know where to render the reply form.
  const getThreadId = (commentId: string): string => {
    const c = comments.find((x) => x.id === commentId)
    if (!c || !c.parentId) return commentId
    return c.parentId
  }

  const threadId = replyingToId ? getThreadId(replyingToId) : null
  const replyTarget = replyingToId
    ? comments.find((c) => c.id === replyingToId)
    : null
  // Show @mention label only when replying to a reply (replyTarget has parentId)
  const mentionName = replyTarget?.parentId ? replyTarget.userDisplayName : undefined

  const toggleReply = (commentId: string) => {
    setReplyingToId((prev) => (prev === commentId ? null : commentId))
  }

  return (
    <section className="mt-8 border-t pt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-5">
        コメント
        <span className="ml-2 text-sm font-normal text-gray-400">
          ({comments.length})
        </span>
      </h2>

      {topLevel.length === 0 && (
        <p className="text-gray-400 text-sm mb-6">
          コメントはまだありません。最初のコメントを残してみてください。
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
                petId={petId}
                isReplyActive={replyingToId === comment.id}
                onReply={() => toggleReply(comment.id)}
              />

              {(replies.length > 0 || isFormHere) && (
                <div className="ml-10 mt-3 space-y-3">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={user?.uid}
                      currentUserPhotoURL={currentUserPhotoURL}
                      petId={petId}
                      isReplyActive={replyingToId === reply.id}
                      onReply={() => toggleReply(reply.id)}
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
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">
          コメントするには{' '}
          <a href="/auth/login" className="text-red-500 underline">
            ログイン
          </a>{' '}
          してください
        </p>
      )}
    </section>
  )
}

function CommentItem({
  comment,
  currentUserId,
  currentUserPhotoURL,
  petId,
  onReply,
  isReplyActive,
}: {
  comment: Comment
  currentUserId?: string
  currentUserPhotoURL?: string
  petId: string
  onReply: () => void
  isReplyActive: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const isOwn = currentUserId === comment.userId
  const canReply = Boolean(currentUserId)

  // 自分のコメント → 最新画像。他のユーザー → 保存済み画像。なければイニシャル。
  const photoURL = isOwn
    ? (currentUserPhotoURL ?? comment.userPhotoURL)
    : comment.userPhotoURL
  const avatarLetter = comment.userDisplayName.charAt(0) || '?'

  const handleDelete = async () => {
    if (!confirm('このコメントを削除しますか？')) return
    setDeleting(true)
    try {
      await deleteComment(petId, comment.id)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold"
           style={{ background: '#FFE0A0', color: '#7A4500' }}>
        {photoURL ? (
          <Image src={photoURL} alt={comment.userDisplayName} width={32} height={32} className="object-cover w-full h-full" />
        ) : (
          avatarLetter
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl px-4 py-3" style={{ background: '#FFFAF0', border: '1.5px solid #FFE8B0' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold" style={{ color: '#5A3A1A' }}>
              {comment.userDisplayName}
            </span>
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
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-24 h-24 rounded-lg overflow-hidden block"
                >
                  <Image
                    src={url}
                    alt={`添付画像 ${i + 1}`}
                    fill
                    className="object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 ml-1">
          {canReply && (
            <button
              onClick={onReply}
              className={`text-xs transition-colors ${
                isReplyActive
                  ? 'text-red-500 font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isReplyActive ? '返信をキャンセル' : '返信'}
            </button>
          )}
          {isOwn && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              削除
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

  // Focus textarea when reply form opens
  useEffect(() => {
    if (compact) {
      textareaRef.current?.focus()
    }
  }, [compact])

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return
    const remaining = 3 - files.length
    const toAdd = Array.from(selected).slice(0, remaining)
    setFiles((prev) => [...prev, ...toAdd].slice(0, 3))
    toAdd.forEach((f) => {
      const reader = new FileReader()
      reader.onload = (e) =>
        setPreviews((prev) =>
          [...prev, e.target?.result as string].slice(0, 3)
        )
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
        // profile.photoURL は setProfile() で明示的に更新されるため user.photoURL より常に最新
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
          <span className="font-semibold text-red-500">@{mentionName}</span>{' '}
          に返信
        </p>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          parentId
            ? '返信を入力...'
            : '情報をお持ちの場合はコメントしてください...'
        }
        rows={compact ? 2 : 3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
      />

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {previews.map((src, i) => (
            <div
              key={i}
              className="relative w-20 h-20 rounded-lg overflow-hidden"
            >
              <Image src={src} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <div className="flex items-center gap-2 mt-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {files.length < 3 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            画像を追加 ({files.length}/3)
          </button>
        )}

        <div className="flex-1" />

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || (!text.trim() && files.length === 0)}
          className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? '送信中...'
            : parentId
              ? '返信する'
              : 'コメントする'}
        </button>
      </div>
    </form>
  )
}
