import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { TITLE_DEFINITIONS, BADGE_DEFINITIONS } from '@pet-rescue/shared'

const USERS = 'users'

/** 累計ポイントに応じて解除された称号IDの配列を返す */
export function getEarnedTitleIds(totalPointsEarned: number): string[] {
  return TITLE_DEFINITIONS
    .filter((t) => totalPointsEarned >= t.requiredPoints)
    .map((t) => t.id)
}

/** 称号IDから称号名を返す */
export function getTitleName(titleId: string): string {
  return TITLE_DEFINITIONS.find((t) => t.id === titleId)?.name ?? titleId
}

/** バッジIDからバッジ定義を返す */
export function getBadgeDefinition(badgeId: string) {
  return BADGE_DEFINITIONS.find((b) => b.id === badgeId) ?? null
}

/** 新しく解除された称号をユーザーに付与し、新称号IDの配列を返す */
export async function checkAndUpdateTitles(
  userId: string,
  totalPointsEarned: number
): Promise<string[]> {
  const snap = await getDoc(doc(db, USERS, userId))
  if (!snap.exists()) return []

  const currentTitles: string[] = snap.data().titles ?? []
  const earned = getEarnedTitleIds(totalPointsEarned)
  const newTitles = earned.filter((id) => !currentTitles.includes(id))

  if (newTitles.length > 0) {
    const updatedTitles = [...currentTitles, ...newTitles]
    const updates: Record<string, unknown> = { titles: updatedTitles }
    // 初めて称号を取得した場合、selectedTitle を自動設定
    if (!snap.data().selectedTitle) {
      updates.selectedTitle = newTitles[newTitles.length - 1]
    } else {
      // 既存の selectedTitle より上位の称号が解除された場合は更新
      const newHighest = newTitles[newTitles.length - 1]
      const currentSelectedIndex = TITLE_DEFINITIONS.findIndex(
        (t) => t.id === snap.data().selectedTitle
      )
      const newHighestIndex = TITLE_DEFINITIONS.findIndex((t) => t.id === newHighest)
      if (newHighestIndex > currentSelectedIndex) {
        updates.selectedTitle = newHighest
      }
    }
    await updateDoc(doc(db, USERS, userId), updates)
  }

  return newTitles
}

/** バッジを付与する（未取得の場合のみ）。付与したら true を返す */
export async function checkAndAwardBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  const snap = await getDoc(doc(db, USERS, userId))
  if (!snap.exists()) return false

  const currentBadges: string[] = snap.data().badges ?? []
  if (currentBadges.includes(badgeId)) return false

  await updateDoc(doc(db, USERS, userId), {
    badges: [...currentBadges, badgeId],
  })
  return true
}

/**
 * イベントに応じて複数バッジをチェック・付与する。
 * 付与されたバッジIDの配列を返す。
 */
export async function checkAndAwardBadges(
  userId: string,
  events: {
    isFirstPost?: boolean
    isFirstSighting?: boolean
    isFirstProtection?: boolean
    isBestInfo?: boolean
    isDiscovery?: boolean
  }
): Promise<string[]> {
  const snap = await getDoc(doc(db, USERS, userId))
  if (!snap.exists()) return []

  const currentBadges: string[] = snap.data().badges ?? []
  const toAward: string[] = []

  if (events.isFirstPost && !currentBadges.includes('first_post')) {
    toAward.push('first_post')
  }
  if (events.isFirstSighting && !currentBadges.includes('first_sighting')) {
    toAward.push('first_sighting')
  }
  if (events.isFirstProtection && !currentBadges.includes('first_protection')) {
    toAward.push('first_protection')
  }
  if (events.isBestInfo && !currentBadges.includes('best_info_provider')) {
    toAward.push('best_info_provider')
  }
  if (events.isDiscovery && !currentBadges.includes('discovery_contributor')) {
    toAward.push('discovery_contributor')
  }

  if (toAward.length > 0) {
    await updateDoc(doc(db, USERS, userId), {
      badges: [...currentBadges, ...toAward],
    })
  }

  return toAward
}
