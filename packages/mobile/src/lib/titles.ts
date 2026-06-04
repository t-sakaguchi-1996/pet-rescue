import { TITLE_DEFINITIONS, BADGE_DEFINITIONS } from '../types'

export function getTitleName(titleId: string): string {
  return TITLE_DEFINITIONS.find((t) => t.id === titleId)?.name ?? titleId
}

export function getBadgeDefinition(badgeId: string) {
  return BADGE_DEFINITIONS.find((b) => b.id === badgeId) ?? null
}
