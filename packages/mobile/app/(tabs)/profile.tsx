import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import {
  fetchUserPets,
  fetchUserProfile,
  updateUserSettings,
  deletePet,
} from '../../src/lib/firestore'
import { fetchPointTransactions } from '../../src/lib/points'
import { fetchUserRewardExchanges } from '../../src/lib/rewards'
import { fetchRanking, findUserRank } from '../../src/lib/rankings'
import { getTitleName, getBadgeDefinition } from '../../src/lib/titles'
import { requestNotificationPermission } from '../../src/lib/notifications'
import PetCard from '../../src/components/PetCard'
import LoadingIndicator from '../../src/components/LoadingIndicator'
import type { Pet, UserProfile, PointTransaction, RewardExchange } from '../../src/types'
import { TITLE_DEFINITIONS, BADGE_DEFINITIONS, TRANSACTION_TYPE_LABELS } from '../../src/types'


// EXCHANGE_STATUS_LABEL is not exported from types — define it here
const STATUS_LABEL: Record<string, string> = {
  requested: '申請済み',
  approved: '承認済み',
  shipped: '発送済み',
  completed: '受取完了',
  cancelled: 'キャンセル',
  rejected: '却下',
}

const STATUS_COLOR: Record<string, string> = {
  requested: '#E8A93A',
  approved: '#2AAA6E',
  shipped: '#4A90D9',
  completed: '#2AAA6E',
  cancelled: '#999',
  rejected: '#CC3333',
}

type ProfileTab = 'overview' | 'points' | 'titles' | 'rewards' | 'posts' | 'settings'

const TABS: { id: ProfileTab; label: string; emoji: string }[] = [
  { id: 'overview', label: '概要', emoji: '🏠' },
  { id: 'points', label: 'ポイント', emoji: '⭐' },
  { id: 'titles', label: '称号・バッジ', emoji: '🎖️' },
  { id: 'rewards', label: '交換履歴', emoji: '🎁' },
  { id: 'posts', label: '投稿', emoji: '📋' },
  { id: 'settings', label: '設定', emoji: '⚙️' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [exchanges, setExchanges] = useState<RewardExchange[]>([])
  const [totalRank, setTotalRank] = useState<number | null>(null)
  const [monthlyRank, setMonthlyRank] = useState<number | null>(null)
  const [selectedTitleEdit, setSelectedTitleEdit] = useState<string | null>(null)
  const [savingTitle, setSavingTitle] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
  const [notifEnabled, setNotifEnabled] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadAll = async () => {
      const [p, userPets, txs, exs] = await Promise.all([
        fetchUserProfile(user.uid),
        fetchUserPets(user.uid),
        fetchPointTransactions(user.uid).catch(() => [] as PointTransaction[]),
        fetchUserRewardExchanges(user.uid).catch(() => [] as RewardExchange[]),
      ])
      setProfile(p)
      setPets(userPets)
      setTransactions(txs)
      setExchanges(exs)
      setSelectedTitleEdit(p?.selectedTitle ?? null)

      Promise.all([
        fetchRanking('total_points', user.uid),
        fetchRanking('monthly_points', user.uid),
      ]).then(([total, monthly]) => {
        setTotalRank(findUserRank(total, user.uid))
        setMonthlyRank(findUserRank(monthly, user.uid))
      }).catch(() => {})
    }
    void loadAll()
  }, [user])

  const handleEnableNotifications = async () => {
    if (!user) return
    const enabled = await requestNotificationPermission(user.uid)
    setNotifEnabled(enabled)
    Alert.alert('通知設定', enabled ? '近くで迷子ペットが投稿された際に通知します' : '通知が許可されませんでした')
  }

  const handleLogout = async () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト', style: 'destructive',
        onPress: async () => {
          await logout()
          setPets([])
          setProfile(null)
        },
      },
    ])
  }

  const handleDeletePet = async (petId: string) => {
    Alert.alert('削除確認', 'この投稿を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          await deletePet(petId).catch(() => {})
          setPets((prev) => prev.filter((p) => p.id !== petId))
        },
      },
    ])
  }

  const handleSaveTitle = async () => {
    if (!user) return
    setSavingTitle(true)
    await updateUserSettings(user.uid, { selectedTitle: selectedTitleEdit ?? undefined }).catch(() => {})
    setProfile((prev) => prev ? { ...prev, selectedTitle: selectedTitleEdit ?? undefined } : prev)
    setSavingTitle(false)
    Alert.alert('保存しました', '称号の表示設定を更新しました')
  }

  const handleToggleRanking = async (value: boolean) => {
    if (!user) return
    await updateUserSettings(user.uid, { showInRanking: value }).catch(() => {})
    setProfile((prev) => prev ? { ...prev, showInRanking: value } : prev)
  }

  if (loading) {
    return <LoadingIndicator />
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>🐾</Text>
        <Text style={styles.message}>ログインしてマイページを確認</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.primaryBtnText}>ログイン</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth/register')}>
          <Text style={styles.secondaryBtnText}>新規登録</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const points = profile?.points ?? 0
  const totalEarned = profile?.totalPointsEarned ?? 0
  const earnedTitles = profile?.titles ?? []
  const earnedBadges = profile?.badges ?? []
  const selectedTitleName = profile?.selectedTitle ? getTitleName(profile.selectedTitle) : null

  // 今月のポイント
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthlyPoints = transactions
    .filter((t) => !t.isCancelled && t.amount > 0 && t.date >= monthStart)
    .reduce((s, t) => s + t.amount, 0)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      {/* プロフィールヘッダー */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {(profile?.displayName ?? user.displayName ?? user.email ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{profile?.displayName ?? user.displayName ?? 'ユーザー'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {selectedTitleName && (
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>🏅 {selectedTitleName}</Text>
            </View>
          )}
          {earnedBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {earnedBadges.slice(0, 5).map((id) => {
                const b = getBadgeDefinition(id)
                return b ? <Text key={id} style={styles.badgeEmoji}>{b.emoji}</Text> : null
              })}
              {earnedBadges.length > 5 && (
                <Text style={styles.badgeMore}>+{earnedBadges.length - 5}</Text>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.logoutIconBtn} onPress={handleLogout}>
          <Text style={styles.logoutIconText}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      {/* サマリーグリッド */}
      <View style={styles.summaryGrid}>
        {[
          { label: '保有ポイント', value: `${points.toLocaleString()}pt`, emoji: '⭐', color: '#C46B00' },
          { label: '累計獲得', value: `${totalEarned.toLocaleString()}pt`, emoji: '📈', color: '#8B5E1A' },
          { label: '今月の獲得', value: `${monthlyPoints.toLocaleString()}pt`, emoji: '📅', color: '#5A8A3A' },
          { label: '総合順位', value: totalRank ? `${totalRank}位` : '-', emoji: '🏆', color: '#4A6FA5' },
        ].map((item) => (
          <View key={item.label} style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>{item.emoji}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* 活動実績グリッド */}
      <View style={styles.summaryGrid}>
        {[
          { label: '目撃投稿', value: profile?.sightingCount ?? 0, unit: '件', emoji: '👁️' },
          { label: '保護投稿', value: profile?.protectedPostCount ?? 0, unit: '件', emoji: '🤝' },
          { label: '最有力情報', value: profile?.bestInfoCount ?? 0, unit: '回', emoji: '⭐' },
          { label: '発見貢献', value: profile?.discoveryCount ?? 0, unit: '回', emoji: '🎉' },
        ].map((item) => (
          <View key={item.label} style={[styles.summaryCard, styles.summaryCardLight]}>
            <Text style={styles.summaryEmoji}>{item.emoji}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={styles.summaryValueDark}>
              {item.value}<Text style={styles.summaryUnit}>{item.unit}</Text>
            </Text>
          </View>
        ))}
      </View>

      {/* タブ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && styles.tabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
              {t.emoji} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* タブコンテンツ */}
      {activeTab === 'overview' && (
        <View style={styles.tabBody}>
          {/* 目撃情報CTA */}
          <TouchableOpacity style={styles.ctaItem} onPress={() => router.push('/sightings/new')}>
            <Text style={styles.ctaItemEmoji}>👁️</Text>
            <View style={styles.ctaItemInfo}>
              <Text style={styles.ctaItemTitle}>捜索に協力して貢献ポイントを獲得</Text>
              <Text style={styles.ctaItemSub}>目撃情報を投稿 +2pt / 保護投稿 +10pt</Text>
            </View>
            <Text style={styles.ctaArrow}>→</Text>
          </TouchableOpacity>

          {/* ランキング */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewCardHeader}>
              <Text style={styles.overviewCardTitle}>🏆 ランキング順位</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/ranking')}>
                <Text style={styles.overviewCardLink}>ランキングを見る</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rankGrid}>
              {[
                { label: '総合順位', rank: totalRank },
                { label: '今月の順位', rank: monthlyRank },
              ].map((item) => (
                <View key={item.label} style={styles.rankCard}>
                  <Text style={styles.rankCardLabel}>{item.label}</Text>
                  <Text style={[styles.rankCardValue, !item.rank && styles.rankCardValueEmpty]}>
                    {item.rank ? `#${item.rank}` : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 最近のポイント */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewCardHeader}>
              <Text style={styles.overviewCardTitle}>⭐ 最近のポイント</Text>
              <TouchableOpacity onPress={() => setActiveTab('points')}>
                <Text style={styles.overviewCardLink}>全件見る</Text>
              </TouchableOpacity>
            </View>
            {transactions.slice(0, 5).length === 0 ? (
              <Text style={styles.emptySubText}>ポイント履歴はまだありません</Text>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <View key={tx.id} style={[styles.txRow, tx.isCancelled && styles.txRowCancelled]}>
                  <Text style={styles.txLabel} numberOfLines={1}>
                    {TRANSACTION_TYPE_LABELS[tx.transactionType] ?? tx.transactionType}
                    {tx.isCancelled ? ' [取消]' : ''}
                  </Text>
                  <Text style={[styles.txAmount, { color: tx.amount >= 0 ? '#C46B00' : '#CC3333' }]}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}pt
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {activeTab === 'points' && (
        <View style={styles.tabBody}>
          <View style={styles.pointsSummaryCard}>
            <View style={styles.pointsSummaryRow}>
              {[
                { label: '保有ポイント', value: points, color: '#C46B00' },
                { label: '累計獲得', value: totalEarned, color: '#8B5E1A' },
                { label: '今月の獲得', value: monthlyPoints, color: '#5A8A3A' },
              ].map((item) => (
                <View key={item.label} style={styles.pointsSummaryItem}>
                  <Text style={styles.pointsSummaryLabel}>{item.label}</Text>
                  <Text style={[styles.pointsSummaryValue, { color: item.color }]}>
                    {item.value.toLocaleString()}<Text style={styles.pointsPt}>pt</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.rewardsLink} onPress={() => router.push('/rewards')}>
            <Text style={styles.rewardsLinkText}>🎁 貢献ポイントを特典と交換する</Text>
          </TouchableOpacity>

          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ポイント履歴はまだありません</Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={[styles.txCard, tx.isCancelled && styles.txCardCancelled]}>
                <View>
                  <Text style={styles.txCardLabel}>
                    {TRANSACTION_TYPE_LABELS[tx.transactionType] ?? tx.transactionType}
                    {tx.isCancelled && <Text style={styles.txCancelledTag}> [取消済]</Text>}
                  </Text>
                  {tx.description && <Text style={styles.txCardDesc}>{tx.description}</Text>}
                  <Text style={styles.txCardDate}>{tx.date}</Text>
                </View>
                <Text style={[styles.txCardAmount, { color: tx.amount >= 0 ? '#C46B00' : '#CC3333' }]}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}pt
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'titles' && (
        <View style={styles.tabBody}>
          <Text style={styles.sectionTitle}>🎖️ 取得済み称号</Text>
          {TITLE_DEFINITIONS.map((title) => {
            const earned = earnedTitles.includes(title.id)
            const isSelected = profile?.selectedTitle === title.id
            return (
              <View key={title.id} style={[styles.titleCard, isSelected && styles.titleCardSelected, !earned && styles.titleCardLocked]}>
                <View style={styles.titleCardInfo}>
                  <Text style={[styles.titleName, !earned && styles.titleNameLocked]}>{title.name}</Text>
                  <Text style={styles.titlePoints}>
                    {earned ? '✓ 取得済み' : `必要: ${title.requiredPoints.toLocaleString()}pt`}
                  </Text>
                </View>
                {earned && (
                  <TouchableOpacity
                    style={[styles.titleSelectBtn, isSelected && styles.titleSelectBtnActive]}
                    onPress={() => setSelectedTitleEdit(isSelected ? null : title.id)}
                  >
                    <Text style={styles.titleSelectBtnText}>
                      {isSelected ? '表示中' : '表示する'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
          {selectedTitleEdit !== profile?.selectedTitle && (
            <TouchableOpacity
              style={styles.saveTitleBtn}
              onPress={handleSaveTitle}
              disabled={savingTitle}
            >
              <Text style={styles.saveTitleBtnText}>
                {savingTitle ? '保存中...' : '称号の表示設定を保存'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionTitle, styles.sectionTitleMt]}>🏅 取得済みバッジ</Text>
          <View style={styles.badgeGrid}>
            {BADGE_DEFINITIONS.map((badge) => {
              const earned = earnedBadges.includes(badge.id)
              return (
                <View key={badge.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                  <Text style={styles.badgeCardEmoji}>{badge.emoji}</Text>
                  <Text style={[styles.badgeCardName, !earned && styles.badgeCardNameLocked]} numberOfLines={2}>{badge.name}</Text>
                  {!earned && <Text style={styles.badgeCardNotYet}>未取得</Text>}
                </View>
              )
            })}
          </View>
        </View>
      )}

      {activeTab === 'rewards' && (
        <View style={styles.tabBody}>
          <View style={styles.rewardsTabHeader}>
            <Text style={styles.sectionTitle}>🎁 景品交換履歴</Text>
            <TouchableOpacity onPress={() => router.push('/rewards')}>
              <Text style={styles.overviewCardLink}>特典一覧へ</Text>
            </TouchableOpacity>
          </View>
          {exchanges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🎁</Text>
              <Text style={styles.emptyText}>交換履歴はまだありません</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/rewards')}>
                <Text style={styles.primaryBtnText}>特典一覧を見る</Text>
              </TouchableOpacity>
            </View>
          ) : (
            exchanges.map((ex) => {
              const isDigital = ex.rewardType === 'badge' || ex.rewardType === 'title'
              const statusLabel = isDigital && ex.status === 'approved' ? '取得済み' : (STATUS_LABEL[ex.status] ?? ex.status)
              const statusColor = isDigital && ex.status === 'approved' ? '#226622' : (STATUS_COLOR[ex.status] ?? '#888')
              return (
                <View key={ex.id} style={styles.exchangeCard}>
                  <View style={styles.exchangeCardRow}>
                    <View style={styles.exchangeCardInfo}>
                      <Text style={styles.exchangeRewardName}>{ex.rewardName}</Text>
                      <Text style={[styles.exchangePoints, isDigital && styles.exchangePointsDigital]}>
                        {isDigital ? '消費なし' : `${ex.requiredPoints.toLocaleString()}pt`}
                      </Text>
                      <Text style={styles.exchangeDate}>
                        {new Date(ex.requestedAt).toLocaleDateString('ja-JP')}
                      </Text>
                      {ex.adminNote && (
                        <Text style={styles.adminNote}>📝 {ex.adminNote}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}20` }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </View>
      )}

      {activeTab === 'posts' && (
        <View style={styles.tabBody}>
          <View style={styles.postsHeader}>
            <Text style={styles.postsHeaderTitle}>自分の投稿 ({pets.length}件)</Text>
            <TouchableOpacity style={styles.newPostBtn} onPress={() => router.push('/(tabs)/post')}>
              <Text style={styles.newPostBtnText}>新規投稿</Text>
            </TouchableOpacity>
          </View>
          {pets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>まだ投稿がありません</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/post')}>
                <Text style={styles.primaryBtnText}>最初の投稿をする</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.petGrid}>
              {pets.map((item) => (
                <View key={item.id} style={styles.petCardWrapper}>
                  <PetCard pet={item} onPress={() => router.push(`/pet/${item.id}`)} />
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePet(item.id)}>
                    <Text style={styles.deleteBtnText}>削除</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'settings' && (
        <View style={styles.tabBody}>
          {/* ランキング表示設定 */}
          <View style={styles.settingCard}>
            <Text style={styles.settingCardTitle}>🏆 ランキング表示設定</Text>
            <Text style={styles.settingCardDesc}>
              オフにすると、ランキングでは「匿名ユーザー」として表示されます
            </Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingRowLabel}>
                {(profile?.showInRanking ?? true) ? 'ランキングに表示する' : 'ランキングに表示しない'}
              </Text>
              <Switch
                value={profile?.showInRanking ?? true}
                onValueChange={handleToggleRanking}
                trackColor={{ false: '#DDD', true: '#C46B00' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* 通知設定 */}
          <View style={styles.settingCard}>
            <Text style={styles.settingCardTitle}>🔔 通知設定</Text>
            <TouchableOpacity style={styles.settingBtn} onPress={handleEnableNotifications}>
              <Text style={styles.settingBtnText}>
                {notifEnabled ? '🔔 通知オン' : '通知を有効にする'}
              </Text>
              <Text style={styles.settingBtnArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 目撃情報投稿 */}
          <View style={styles.settingCard}>
            <Text style={styles.settingCardTitle}>👁️ 目撃情報</Text>
            <TouchableOpacity style={styles.settingBtn} onPress={() => router.push('/sightings/new')}>
              <Text style={styles.settingBtnText}>目撃情報を投稿する</Text>
              <Text style={styles.settingBtnArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ログアウト */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const W = '#3D2400'
const M = '#7A4500'
const A = '#FFC96B'
const BG = '#FFF3DC'
const BR = '#FFD98A'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  containerContent: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  message: { color: '#6b7280', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  primaryBtn: { backgroundColor: A, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10, marginBottom: 10, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: W, fontWeight: 'bold', fontSize: 15 },
  secondaryBtn: { backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  secondaryBtnText: { color: '#374151', fontWeight: 'bold', fontSize: 15 },

  profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  avatarWrapper: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', flexShrink: 0 },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: 'bold', color: M },
  profileInfo: { flex: 1, minWidth: 0 },
  displayName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  email: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  titleBadge: { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: BR, maxWidth: '100%' },
  titleBadgeText: { fontSize: 11, color: M, fontWeight: 'bold', flexShrink: 1 },
  badgeRow: { flexDirection: 'row', gap: 3, marginTop: 3, flexWrap: 'wrap' },
  badgeEmoji: { fontSize: 16 },
  badgeMore: { fontSize: 11, color: '#B08050' },
  logoutIconBtn: { flexShrink: 0 },
  logoutIconText: { fontSize: 12, color: '#9ca3af' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'nowrap', gap: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryCard: { flex: 1, padding: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f3f4f6' },
  summaryCardLight: { backgroundColor: '#FFF9F0' },
  summaryEmoji: { fontSize: 16, marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: '#B08050', marginBottom: 2, textAlign: 'center' },
  summaryValue: { fontSize: 13, fontWeight: 'bold' },
  summaryValueDark: { fontSize: 13, fontWeight: 'bold', color: '#5A3A1A' },
  summaryUnit: { fontSize: 10, fontWeight: 'normal' },

  tabScroll: { height: 58, maxHeight: 58, minHeight: 58,backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabContent: { paddingHorizontal: 12, paddingVertical: 0, gap: 6, alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: BG, borderWidth: 1.5, borderColor: BR },
  tabActive: { backgroundColor: '#C46B00', borderColor: '#C46B00' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#8B5E1A' },
  tabTextActive: { color: '#fff' },

  tabBody: { padding: 12 },

  // Overview
  ctaItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: BR, borderStyle: 'dashed', marginBottom: 10 },
  ctaItemEmoji: { fontSize: 28 },
  ctaItemInfo: { flex: 1 },
  ctaItemTitle: { fontSize: 13, fontWeight: 'bold', color: M },
  ctaItemSub: { fontSize: 11, color: '#B08050', marginTop: 2 },
  ctaArrow: { fontSize: 16, fontWeight: 'bold', color: '#C46B00' },
  overviewCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: '#FFE0A0', marginBottom: 10 },
  overviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  overviewCardTitle: { fontSize: 13, fontWeight: 'bold', color: '#5A3A1A' },
  overviewCardLink: { fontSize: 12, color: '#C46B00', textDecorationLine: 'underline' },
  rankGrid: { flexDirection: 'row', gap: 8 },
  rankCard: { flex: 1, padding: 10, backgroundColor: '#FFF9F0', borderRadius: 10, borderWidth: 1, borderColor: '#FFE0A0', alignItems: 'center' },
  rankCardLabel: { fontSize: 11, color: '#B08050', marginBottom: 4 },
  rankCardValue: { fontSize: 22, fontWeight: 'bold', color: '#C46B00' },
  rankCardValueEmpty: { color: '#CCC' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: '#FFF9F0', marginBottom: 4 },
  txRowCancelled: { opacity: 0.5 },
  txLabel: { fontSize: 12, color: '#5A3A1A', flex: 1 },
  txAmount: { fontSize: 12, fontWeight: 'bold' },
  emptySubText: { fontSize: 12, color: '#9ca3af' },

  // Points tab
  pointsSummaryCard: { backgroundColor: BG, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: BR, marginBottom: 12 },
  pointsSummaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pointsSummaryItem: { alignItems: 'center' },
  pointsSummaryLabel: { fontSize: 11, fontWeight: 'bold', color: M, marginBottom: 2 },
  pointsSummaryValue: { fontSize: 20, fontWeight: 'bold' },
  pointsPt: { fontSize: 12, fontWeight: 'normal' },
  rewardsLink: { padding: 12, borderRadius: 14, backgroundColor: BG, borderWidth: 1.5, borderColor: BR, borderStyle: 'dashed', alignItems: 'center', marginBottom: 12 },
  rewardsLinkText: { fontSize: 13, fontWeight: 'bold', color: M },
  txCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#FFE0A0', marginBottom: 8 },
  txCardCancelled: { opacity: 0.5 },
  txCardLabel: { fontSize: 13, fontWeight: 'bold', color: W },
  txCancelledTag: { fontSize: 11, color: '#CC3333' },
  txCardDesc: { fontSize: 11, color: '#B08050', marginTop: 2 },
  txCardDate: { fontSize: 11, color: '#C8A87A', marginTop: 2 },
  txCardAmount: { fontSize: 16, fontWeight: 'bold' },

  // Titles tab
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#5A3A1A', marginBottom: 10 },
  sectionTitleMt: { marginTop: 16 },
  titleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#FFE0A0', marginBottom: 8 },
  titleCardSelected: { backgroundColor: BG, borderColor: BR, borderWidth: 2 },
  titleCardLocked: { opacity: 0.45, backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
  titleCardInfo: { flex: 1 },
  titleName: { fontSize: 14, fontWeight: 'bold', color: W },
  titleNameLocked: { color: '#999' },
  titlePoints: { fontSize: 12, color: '#B08050', marginTop: 2 },
  titleSelectBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: BG, borderWidth: 1, borderColor: BR },
  titleSelectBtnActive: { backgroundColor: BR },
  titleSelectBtnText: { fontSize: 12, fontWeight: 'bold', color: M },
  saveTitleBtn: { backgroundColor: '#C46B00', borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  saveTitleBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '30%', minHeight: 90, padding: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#FFE0A0', alignItems: 'center', justifyContent: 'center' },
  badgeCardLocked: { opacity: 0.4, backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
  badgeCardEmoji: { fontSize: 26, marginBottom: 4 },
  badgeCardName: { fontSize: 10, fontWeight: 'bold', color: W, textAlign: 'center', lineHeight: 14 },
  badgeCardNameLocked: { color: '#999' },
  badgeCardNotYet: { fontSize: 9, color: '#CCC', marginTop: 2 },

  // Rewards tab
  rewardsTabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  exchangeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#FFE0A0', marginBottom: 8 },
  exchangeCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  exchangeCardInfo: { flex: 1 },
  exchangeRewardName: { fontSize: 14, fontWeight: 'bold', color: W, marginBottom: 3 },
  exchangePoints: { fontSize: 12, color: '#8B6340', marginBottom: 2 },
  exchangePointsDigital: { color: '#226622' },
  exchangeDate: { fontSize: 12, color: '#C8A87A' },
  adminNote: { fontSize: 12, color: M, marginTop: 6, padding: 8, backgroundColor: BG, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, flexShrink: 0 },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold' },

  // Posts tab
  postsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  postsHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#5A3A1A' },
  newPostBtn: { backgroundColor: '#C46B00', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  newPostBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  petGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  petCardWrapper: { width: '48%', position: 'relative' },
  deleteBtn: { position: 'absolute', bottom: 4, right: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' },
  deleteBtnText: { fontSize: 11, color: '#9ca3af' },

  emptyContainer: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: '#8B6340', fontSize: 14 },

  // Settings tab
  settingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#FFE0A0', marginBottom: 10 },
  settingCardTitle: { fontSize: 13, fontWeight: 'bold', color: '#5A3A1A', marginBottom: 6 },
  settingCardDesc: { fontSize: 12, color: '#8B6340', marginBottom: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingRowLabel: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  settingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  settingBtnText: { fontSize: 14, color: '#374151' },
  settingBtnArrow: { fontSize: 20, color: '#9ca3af' },
  logoutBtn: { margin: 4, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  logoutText: { color: '#6b7280', fontWeight: 'bold' },
})
