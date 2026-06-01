'use client'

import { useAuth } from '@/contexts/AuthContext'

interface Props {
  petOwnerId: string
  contactEmail: string
  contactPhone: string
}

export default function PetContactInfo({
  petOwnerId,
  contactEmail,
  contactPhone,
}: Props) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    )
  }

  const isOwner = user?.uid === petOwnerId

  if (!isOwner) {
    return (
      <div className="bg-gray-50 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-2">連絡先情報</h2>
        <p className="text-sm text-gray-500">
          連絡先は投稿者本人にのみ表示されます。
          <br />
          情報をお持ちの方は下のコメント欄からご連絡ください。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-xl p-5">
      <h2 className="font-semibold text-gray-800 mb-1">連絡先情報</h2>
      <p className="text-xs text-gray-400 mb-3">あなたにのみ表示されています</p>
      {contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium mb-2"
        >
          📧 {contactEmail}
        </a>
      )}
      {contactPhone && (
        <a
          href={`tel:${contactPhone}`}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium"
        >
          📞 {contactPhone}
        </a>
      )}
    </div>
  )
}
