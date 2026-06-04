import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/contexts/AuthContext'
import { fetchRewards, fetchUserRewardExchanges, requestRewardExchange } from '../src/lib/rewards'
import { fetchUserProfile } from '../src/lib/firestore'
import type { Reward, RewardExchange } from '../src/types'

const REWARD_TYPE_EMOJI: Record<string, string> = {
  badge: '🏅',
  title: '🎖️',
  sticker: '🎨',
  coupon: '🎟️',
  donation: '💝',
  physical_goods: '📦',
}

const EXCHANGE_STATUS_LABEL: Record<string, string> = {
  requested: '申請済み',
  approved: '承認済み',
  shipped: '発送済み',
  completed: '受取完了',
  cancelled: 'キャンセル',
  rejected: '却下',
}

const EXCHANGE_STATUS_COLOR: Record<string, string> = {
  requested: '#E8A93A',
  approved: '#2AAA6E',
  shipped: '#4A90D9',
  completed: '#2AAA6E',
  cancelled: '#999',
  rejected: '#CC3333',
}

export default function RewardsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [exchanges, setExchanges] = useState<RewardExchange[]>([])
  const [currentPoints, setCurrentPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exchanging, setExchanging] = useState<string | null>(null)
  const [tab, setTab] = useState<'list' | 'history'>('list')

  const isDigitalAcquisition = (r: Reward) => r.rewardType === 'badge' || r.rewardType === 'title'
  const alreadyAcquired = (r: Reward) =>
    isDigitalAcquisition(r) &&
    exchanges.some((ex) => ex.rewardId === r.id && (ex.status === 'approved' || ex.status === 'completed'))

  useEffect(() => {
    const loadData = async () => {
      const [r, e] = await Promise.all([
        fetchRewards(),
        user ? fetchUserRewardExchanges(user.uid) : Promise.resolve([]),
      ])
      setRewards(r)
      setExchanges(e)

      if (user) {
        const profile = await fetchUserProfile(user.uid)
        setCurrentPoints(profile?.points ?? 0)
      }
      setLoading(false)
    }
    void loadData()
  }, [user])

  const handleExchange = async (reward: Reward) => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (currentPoints < reward.requiredPoints) {
      Alert.alert(
        'ポイント不足',
        `貢献ポイントが不足しています\n必要: ${reward.requiredPoints}pt\n保有: ${currentPoints}pt`
      )
      return
    }
    const isDigital = isDigitalAcquisition(reward)
    const confirmMsg = isDigital
      ? `「${reward.name}」を取得しますか？\n※ ポイントは消費されません。`
      : `「${reward.name}」と交換しますか？\n${reward.requiredPoints}pt が消費されます。`

    Alert.alert(
      isDigital ? '取得確認' : '交換確認',
      confirmMsg,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: isDigital ? '取得する' : '交換する',
          onPress: async () => {
            setExchanging(reward.id)
            try {
              const result = await requestRewardExchange(user.uid, reward.id)
              if (result.success) {
                const [updatedProfile, updatedExchanges] = await Promise.all([
                  fetchUserProfile(user.uid),
                  fetchUserRewardExchanges(user.uid),
                ])
                setCurrentPoints(updatedProfile?.points ?? 0)
                setExchanges(updatedExchanges)
                Alert.alert(
                  '完了',
                  isDigital
                    ? '取得しました！マイページの「称号・バッジ」タブで確認できます。'
                    : '交換申請を受け付けました。マイページで申請状況を確認できます。'
                )
                setTab('history')
              } else {
                Alert.alert('エラー', result.error ?? '取得に失敗しました')
              }
            } catch {
              Alert.alert('エラー', '処理に失敗しました。もう一度お試しください。')
            } finally {
              setExchanging(null)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ヘッダー */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>🎁 貢献特典</Text>
          <Text style={styles.pageSub}>捜索協力で貯めた貢献ポイントを特典と交換できます</Text>
        </View>

        {/* ポイント残高 */}
        {user ? (
          <View style={styles.pointsCard}>
            <Text style={styles.pointsEmoji}>⭐</Text>
            <View>
              <Text style={styles.pointsLabel}>現在の保有ポイント</Text>
              <Text style={styles.pointsValue}>
                {currentPoints.toLocaleString()}<Text style={styles.pointsUnit}> pt</Text>
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>交換するにはログインが必要です</Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginPromptLink}>ログイン / 新規登録</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* タブ */}
        <View style={styles.tabRow}>
          {(['list', 'history'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'list' ? '🎁 特典一覧' : '📋 交換履歴'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#C46B00" size="large" />
          </View>
        ) : tab === 'list' ? (
          <>
            {rewards.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🎁</Text>
                <Text style={styles.emptyText}>特典がまだ登録されていません</Text>
              </View>
            ) : (
              <View style={styles.rewardList}>
                {rewards.map((reward) => {
                  const isDigital = isDigitalAcquisition(reward)
                  const acquired = alreadyAcquired(reward)
                  const canAct = !!(user && currentPoints >= reward.requiredPoints && !acquired)
                  const emoji = REWARD_TYPE_EMOJI[reward.rewardType] ?? '🎁'
                  const isHighValue = reward.requiredPoints >= 10000
                  const outOfStock = !isDigital && reward.stock !== null && reward.stock !== undefined && reward.stock <= 0

                  return (
                    <View
                      key={reward.id}
                      style={[styles.rewardCard, isHighValue && !isDigital && styles.rewardCardGold]}
                    >
                      <View style={styles.rewardRow}>
                        <Text style={styles.rewardEmoji}>{emoji}</Text>
                        <View style={styles.rewardInfo}>
                          <View style={styles.rewardTitleRow}>
                            <Text style={styles.rewardName}>{reward.name}</Text>
                            {isDigital && (
                              <View style={styles.noPointBadge}>
                                <Text style={styles.noPointBadgeText}>ポイント消費なし</Text>
                              </View>
                            )}
                            {isHighValue && !isDigital && (
                              <View style={styles.monthlyBadge}>
                                <Text style={styles.monthlyBadgeText}>月1回</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.rewardDesc} numberOfLines={2}>{reward.description}</Text>
                          <View style={styles.rewardFooter}>
                            <Text style={styles.rewardPoints}>{reward.requiredPoints.toLocaleString()}pt</Text>
                            <Text style={styles.rewardPointsLabel}>
                              {isDigital ? '以上で取得可能' : '消費'}
                            </Text>
                            {!isDigital && reward.stock !== null && reward.stock !== undefined && (
                              <Text style={[styles.stockText, reward.stock <= 5 && styles.stockLow]}>
                                残り {reward.stock} 個
                              </Text>
                            )}
                          </View>
                          {user && !canAct && !acquired && !outOfStock && (
                            <Text style={styles.shortfall}>
                              あと {(reward.requiredPoints - currentPoints).toLocaleString()}pt
                              {isDigital ? ' 以上で取得可能' : ' で交換可能'}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.exchangeBtn,
                            acquired && styles.exchangeBtnAcquired,
                            canAct && !acquired && styles.exchangeBtnCanAct,
                          ]}
                          onPress={() => handleExchange(reward)}
                          disabled={(!canAct && !(!acquired && user)) || exchanging === reward.id || outOfStock}
                        >
                          <Text style={[
                            styles.exchangeBtnText,
                            acquired && styles.exchangeBtnTextAcquired,
                            canAct && !acquired && styles.exchangeBtnTextCanAct,
                          ]}>
                            {exchanging === reward.id
                              ? '処理中...'
                              : acquired
                                ? '取得済み'
                                : isDigital ? '取得する' : '交換する'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* ポイント獲得案内 */}
            <View style={styles.earnGuide}>
              <Text style={styles.earnGuideTitle}>貢献ポイントの獲得方法</Text>
              {[
                '👁️ 目撃情報を投稿する → +2pt（1日最大10pt）',
                '🤝 保護した子を報告する → +10pt（1日最大20pt）',
                '⭐ コメント・目撃情報が最有力情報に選ばれる → +100pt',
                '🎉 提供情報が実際の発見につながる → さらに+300pt',
              ].map((line, i) => (
                <Text key={i} style={styles.earnGuideLine}>{line}</Text>
              ))}
              <Text style={styles.earnGuideNote}>
                ※ 貢献ポイントは捜索協力実績の可視化のための指標です
              </Text>
            </View>
          </>
        ) : (
          /* 交換履歴 */
          <View>
            {!user ? (
              <Text style={styles.historyLogin}>ログインして交換履歴を確認してください</Text>
            ) : exchanges.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyText}>交換履歴はまだありません</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {exchanges.map((ex) => {
                  const isDigital = ex.rewardType === 'badge' || ex.rewardType === 'title'
                  const statusLabel = isDigital && ex.status === 'approved' ? '取得済み' : (EXCHANGE_STATUS_LABEL[ex.status] ?? ex.status)
                  const statusColor = isDigital && ex.status === 'approved' ? '#226622' : (EXCHANGE_STATUS_COLOR[ex.status] ?? '#888')
                  return (
                    <View key={ex.id} style={styles.historyCard}>
                      <View style={styles.historyCardRow}>
                        <View style={styles.historyCardInfo}>
                          <Text style={styles.historyRewardName}>{ex.rewardName}</Text>
                          <Text style={[styles.historyPoints, isDigital && styles.historyPointsDigital]}>
                            {isDigital ? '消費なし' : `${ex.requiredPoints.toLocaleString()}pt`}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(ex.requestedAt).toLocaleDateString('ja-JP')}
                          </Text>
                          {ex.adminNote && (
                            <Text style={styles.adminNote}>📝 {ex.adminNote}</Text>
                          )}
                        </View>
                        <View style={[styles.statusBadge, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}20` }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {statusLabel}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },

  pageHeader: { alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: '#3D2400', marginBottom: 4 },
  pageSub: { fontSize: 13, color: '#8B6340', textAlign: 'center' },

  pointsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16,
    backgroundColor: '#FFF3DC', borderWidth: 1.5, borderColor: '#FFD98A', marginBottom: 16,
  },
  pointsEmoji: { fontSize: 32 },
  pointsLabel: { fontSize: 12, fontWeight: 'bold', color: '#7A4500' },
  pointsValue: { fontSize: 24, fontWeight: '900', color: '#C46B00' },
  pointsUnit: { fontSize: 14, color: '#C46B00' },

  loginPrompt: {
    padding: 14, borderRadius: 16, backgroundColor: '#FFF9F0',
    borderWidth: 1.5, borderColor: '#FFD98A', borderStyle: 'dashed',
    alignItems: 'center', marginBottom: 16,
  },
  loginPromptText: { fontSize: 13, fontWeight: 'bold', color: '#7A4500', marginBottom: 6 },
  loginPromptLink: { fontSize: 13, fontWeight: 'bold', color: '#C46B00', textDecorationLine: 'underline' },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#FFF3DC', borderWidth: 1.5, borderColor: '#FFD98A',
  },
  tabActive: { backgroundColor: '#C46B00', borderColor: '#C46B00' },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#8B5E1A' },
  tabTextActive: { color: '#fff' },

  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#8B6340' },

  rewardList: { gap: 12, marginBottom: 16 },
  rewardCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#FFE0A0',
  },
  rewardCardGold: { borderColor: '#FFD700', borderWidth: 2 },
  rewardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rewardEmoji: { fontSize: 30, flexShrink: 0, paddingTop: 2 },
  rewardInfo: { flex: 1, minWidth: 0 },
  rewardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  rewardName: { fontSize: 14, fontWeight: 'bold', color: '#3D2400' },
  noPointBadge: { backgroundColor: '#E8FFE8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#B2DFDB' },
  noPointBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#226622' },
  monthlyBadge: { backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  monthlyBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#3D2400' },
  rewardDesc: { fontSize: 12, color: '#8B6340', marginBottom: 6 },
  rewardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardPoints: { fontSize: 18, fontWeight: '900', color: '#C46B00' },
  rewardPointsLabel: { fontSize: 11, color: '#B08050' },
  stockText: { fontSize: 12, color: '#8B6340' },
  stockLow: { color: '#CC3333' },
  shortfall: { fontSize: 11, color: '#B08050', marginTop: 4 },
  exchangeBtn: {
    flexShrink: 0, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#FFF3DC', borderWidth: 1, borderColor: '#FFD98A',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  exchangeBtnAcquired: { backgroundColor: '#E8FFE8', borderColor: '#B2DFDB' },
  exchangeBtnCanAct: { backgroundColor: '#FFC96B', borderColor: '#FFC96B' },
  exchangeBtnText: { fontSize: 12, fontWeight: 'bold', color: '#B08050' },
  exchangeBtnTextAcquired: { color: '#226622' },
  exchangeBtnTextCanAct: { color: '#3D2400' },

  earnGuide: {
    padding: 14, borderRadius: 14, backgroundColor: '#FFF9F0',
    borderWidth: 1.5, borderColor: '#FFD98A', borderStyle: 'dashed',
    marginBottom: 16,
  },
  earnGuideTitle: { fontSize: 13, fontWeight: 'bold', color: '#7A4500', marginBottom: 8 },
  earnGuideLine: { fontSize: 12, color: '#8B6340', marginBottom: 4 },
  earnGuideNote: { fontSize: 11, color: '#C8A87A', marginTop: 6 },

  historyLogin: { textAlign: 'center', fontSize: 13, color: '#8B6340', paddingVertical: 32 },
  historyList: { gap: 10 },
  historyCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FFE0A0',
  },
  historyCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  historyCardInfo: { flex: 1 },
  historyRewardName: { fontSize: 14, fontWeight: 'bold', color: '#3D2400', marginBottom: 3 },
  historyPoints: { fontSize: 12, color: '#8B6340', marginBottom: 2 },
  historyPointsDigital: { color: '#226622' },
  historyDate: { fontSize: 12, color: '#C8A87A' },
  adminNote: {
    fontSize: 12, color: '#7A4500', marginTop: 6, padding: 8,
    backgroundColor: '#FFF3DC', borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, flexShrink: 0,
  },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold' },
})
