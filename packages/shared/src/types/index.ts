export type PetType = 'lost' | 'found'
export type PetSpecies = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other'
export type PetGender = 'male' | 'female' | 'unknown'
export type PetStatus = 'searching' | 'protected' | 'resolved'

export interface PetLocation {
  lat: number
  lng: number
  address: string
  prefecture: string
  city: string
}

export interface Pet {
  id: string
  type: PetType
  species: PetSpecies
  breed: string
  name: string
  color: string
  gender: PetGender
  age: string
  description: string
  images: string[]
  location: PetLocation
  lostDate: string
  status: PetStatus
  userId: string
  ownerDisplayName?: string
  ownerPhotoURL?: string
  contactEmail: string
  contactPhone: string
  searchRadiusKm?: number
  bestInfoId?: string
  bestInfoType?: 'comment' | 'sighting'
  bestInfoPointGranted?: boolean
  discoveryBonusGranted?: boolean
  createdAt: string
  updatedAt: string
}

export type TransactionType =
  | 'sighting'
  | 'protected_post'
  | 'best_comment'
  | 'best_sighting'
  | 'discovery_bonus'
  | 'reward_exchange'
  | 'admin_adjustment'
  | 'cancellation'

export type SourceType =
  | 'sighting'
  | 'protected_post'
  | 'comment'
  | 'lost_pet_post'
  | 'reward'
  | 'admin'

export interface PointTransaction {
  id: string
  userId: string
  transactionType: TransactionType
  amount: number
  sourceType?: SourceType
  sourceId?: string
  description?: string
  date: string
  isCancelled: boolean
  cancelledAt?: string
  cancelledReason?: string
  createdAt: string
}

export type RewardType = 'badge' | 'title' | 'sticker' | 'coupon' | 'donation' | 'physical_goods'

export interface Reward {
  id: string
  name: string
  description: string
  requiredPoints: number
  rewardType: RewardType
  stock?: number | null
  monthlyExchangeLimit?: number | null
  isActive: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export type ExchangeStatus = 'requested' | 'approved' | 'shipped' | 'completed' | 'cancelled' | 'rejected'

export interface RewardExchange {
  id: string
  userId: string
  userDisplayName?: string
  userEmail?: string
  rewardId: string
  rewardName: string
  rewardType?: RewardType
  requiredPoints: number
  status: ExchangeStatus
  requestedAt: string
  approvedAt?: string
  shippedAt?: string
  cancelledAt?: string
  adminNote?: string
}

export type RankingType =
  | 'total_points'
  | 'monthly_points'
  | 'weekly_points'
  | 'sighting_count'
  | 'protection_count'
  | 'best_info_count'
  | 'discovery_count'

export interface RankingEntry {
  rank: number
  userId: string
  displayName: string
  photoURL?: string
  selectedTitle?: string
  badges?: string[]
  score: number
  prefecture?: string
  isCurrentUser?: boolean
}

export interface TitleDefinition {
  id: string
  name: string
  requiredPoints: number
}

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  emoji: string
}

export const TITLE_DEFINITIONS: TitleDefinition[] = [
  { id: 'first_contributor', name: '初回協力者', requiredPoints: 10 },
  { id: 'community_watcher', name: '地域見守りメンバー', requiredPoints: 100 },
  { id: 'search_supporter', name: '捜索サポーター', requiredPoints: 500 },
  { id: 'mygo_supporter', name: 'ANIMAL GOサポーター', requiredPoints: 1000 },
  { id: 'info_provider', name: '有力情報提供者', requiredPoints: 3000 },
  { id: 'regional_rescue', name: '地域レスキュー協力者', requiredPoints: 5000 },
  { id: 'certified_supporter', name: '認定サポーター', requiredPoints: 10000 },
  { id: 'top_searcher', name: 'トップ捜索協力者', requiredPoints: 20000 },
]

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_post', name: '初投稿バッジ', description: '初めて投稿を行いました', emoji: '🌟' },
  { id: 'first_sighting', name: '初目撃投稿バッジ', description: '初めて目撃情報を投稿しました', emoji: '👁️' },
  { id: 'first_protection', name: '初保護投稿バッジ', description: '初めて保護投稿を行いました', emoji: '🤝' },
  { id: 'best_info_provider', name: '最有力情報提供者バッジ', description: '最有力情報に選ばれました', emoji: '⭐' },
  { id: 'discovery_contributor', name: '発見貢献バッジ', description: '発見・保護につながる情報を提供しました', emoji: '🎉' },
  { id: 'monthly_top10', name: '月間TOP10バッジ', description: '月間ランキングTOP10入り', emoji: '🏆' },
  { id: 'weekly_top10', name: '週間TOP10バッジ', description: '週間ランキングTOP10入り', emoji: '🥇' },
  { id: 'local_watcher', name: '地域見守りバッジ', description: '地域の見守り活動に継続貢献', emoji: '🏘️' },
  { id: 'consecutive_contributor', name: '連続協力バッジ', description: '3日以上連続して貢献活動を行いました', emoji: '🔥' },
]

export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  fcmTokens: string[]
  notificationRadius: number
  notificationLocation?: {
    lat: number
    lng: number
  }
  points?: number
  totalPointsEarned?: number
  showInRanking?: boolean
  isBanned?: boolean
  selectedTitle?: string
  titles?: string[]
  badges?: string[]
  sightingCount?: number
  protectedPostCount?: number
  bestInfoCount?: number
  discoveryCount?: number
  createdAt: string
}

export interface Comment {
  id: string
  petId: string
  userId?: string
  guestEmail?: string
  temporaryId?: string
  userDisplayName: string
  userPhotoURL?: string
  text: string
  imageUrls: string[]
  parentId?: string
  isBestInfo?: boolean
  bestInfoPointGranted?: boolean
  createdAt: string
  updatedAt: string
}

export interface SightingLocation {
  address: string
  city: string
  prefecture: string
  lat?: number
  lng?: number
}

export interface Sighting {
  id: string
  sightingType?: 'sighting' | 'found'
  species?: PetSpecies
  title: string
  photos: string[]
  location: SightingLocation
  description?: string
  userId?: string
  guestEmail?: string
  temporaryId?: string
  posterName: string
  posterPhotoURL?: string
  pointGranted: boolean
  emailVerified: boolean
  isBestInfo?: boolean
  bestInfoPointGranted?: boolean
  bestInfoPetId?: string
  createdAt: string
  updatedAt: string
}

export interface AppNotification {
  id: string
  userId: string
  type: 'comment' | 'reply' | 'sighting_nearby' | 'found_nearby' | 'best_info_selected' | 'points_granted' | 'discovery_bonus' | 'reward_exchange_requested' | 'prefecture_sighting' | 'new_matched_sighting_after_edit' | 'new_matched_protected_after_edit'
  petId: string
  petName: string
  fromUserId?: string
  fromUserDisplayName?: string
  sightingId?: string
  amount?: number
  rewardName?: string
  isRead: boolean
  createdAt: string
}

export const SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: '犬',
  cat: '猫',
  rabbit: 'うさぎ',
  bird: '鳥',
  other: 'その他',
}

export const GENDER_LABELS: Record<PetGender, string> = {
  male: 'オス',
  female: 'メス',
  unknown: '不明',
}

export const STATUS_LABELS: Record<PetStatus, string> = {
  searching: '捜索中',
  protected: '保護済み',
  resolved: '解決済み',
}

export const TYPE_LABELS: Record<PetType, string> = {
  lost: '迷子',
  found: '保護',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sighting: '目撃情報投稿',
  protected_post: '保護投稿',
  best_comment: '最有力情報（コメント）',
  best_sighting: '最有力情報（目撃）',
  discovery_bonus: '発見貢献ボーナス',
  reward_exchange: '景品交換',
  admin_adjustment: '管理者調整',
  cancellation: 'ポイント取り消し',
}

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

export const CITIES_BY_PREFECTURE: Record<string, string[]> = {
  '北海道': ['札幌市','函館市','小樽市','旭川市','室蘭市','釧路市','帯広市','北見市','夕張市','岩見沢市','網走市','留萌市','苫小牧市','稚内市','美唄市','芦別市','江別市','赤平市','紋別市','士別市','名寄市','三笠市','根室市','千歳市','滝川市','砂川市','歌志内市','深川市','富良野市','登別市','恵庭市','伊達市','北広島市','石狩市','北斗市'],
  '青森県': ['青森市','弘前市','八戸市','黒石市','五所川原市','十和田市','三沢市','むつ市','つがる市','平川市'],
  '岩手県': ['盛岡市','宮古市','大船渡市','花巻市','北上市','久慈市','遠野市','一関市','陸前高田市','釜石市','二戸市','八幡平市','奥州市','滝沢市'],
  '宮城県': ['仙台市','石巻市','塩竈市','気仙沼市','白石市','名取市','角田市','多賀城市','岩沼市','登米市','栗原市','東松島市','大崎市','富谷市'],
  '秋田県': ['秋田市','能代市','横手市','大館市','男鹿市','湯沢市','鹿角市','由利本荘市','潟上市','大仙市','北秋田市','にかほ市','仙北市'],
  '山形県': ['山形市','米沢市','鶴岡市','酒田市','新庄市','寒河江市','上山市','村山市','長井市','天童市','東根市','尾花沢市','南陽市'],
  '福島県': ['福島市','会津若松市','郡山市','いわき市','白河市','須賀川市','喜多方市','相馬市','二本松市','田村市','南相馬市','伊達市','本宮市'],
  '茨城県': ['水戸市','日立市','土浦市','古河市','石岡市','結城市','龍ケ崎市','下妻市','常総市','常陸太田市','高萩市','北茨城市','笠間市','取手市','つくば市','ひたちなか市','鹿嶋市','潮来市','守谷市','常陸大宮市','那珂市','筑西市','坂東市','稲敷市','かすみがうら市','桜川市','神栖市','行方市','鉾田市','つくばみらい市','小美玉市'],
  '栃木県': ['宇都宮市','足利市','栃木市','佐野市','鹿沼市','日光市','小山市','真岡市','大田原市','矢板市','那須塩原市','さくら市','那須烏山市','下野市'],
  '群馬県': ['前橋市','高崎市','桐生市','伊勢崎市','太田市','沼田市','館林市','渋川市','藤岡市','富岡市','安中市','みどり市'],
  '埼玉県': ['さいたま市','川越市','熊谷市','川口市','行田市','秩父市','所沢市','飯能市','加須市','本庄市','東松山市','春日部市','狭山市','羽生市','鴻巣市','深谷市','上尾市','草加市','越谷市','蕨市','戸田市','入間市','朝霞市','志木市','和光市','新座市','桶川市','久喜市','北本市','八潮市','富士見市','三郷市','蓮田市','坂戸市','幸手市','鶴ヶ島市','日高市','吉川市','ふじみ野市','白岡市'],
  '千葉県': ['千葉市','銚子市','市川市','船橋市','館山市','木更津市','松戸市','野田市','茂原市','成田市','佐倉市','東金市','旭市','習志野市','柏市','勝浦市','市原市','流山市','八千代市','我孫子市','鴨川市','鎌ケ谷市','君津市','富津市','浦安市','四街道市','袖ケ浦市','八街市','印西市','白井市','富里市','南房総市','匝瑳市','香取市','山武市','いすみ市','大網白里市'],
  '東京都': ['千代田区','中央区','港区','新宿区','文京区','台東区','墨田区','江東区','品川区','目黒区','大田区','世田谷区','渋谷区','中野区','杉並区','豊島区','北区','荒川区','板橋区','練馬区','足立区','葛飾区','江戸川区','八王子市','立川市','武蔵野市','三鷹市','青梅市','府中市','昭島市','調布市','町田市','小金井市','小平市','日野市','東村山市','国分寺市','国立市','福生市','狛江市','東大和市','清瀬市','東久留米市','武蔵村山市','多摩市','稲城市','羽村市','あきる野市','西東京市'],
  '神奈川県': ['横浜市','川崎市','相模原市','横須賀市','平塚市','鎌倉市','藤沢市','小田原市','茅ヶ崎市','逗子市','三浦市','秦野市','厚木市','大和市','伊勢原市','海老名市','座間市','南足柄市','綾瀬市'],
  '新潟県': ['新潟市','長岡市','三条市','柏崎市','新発田市','小千谷市','加茂市','十日町市','見附市','村上市','燕市','糸魚川市','妙高市','五泉市','上越市','阿賀野市','佐渡市','魚沼市','南魚沼市','胎内市'],
  '富山県': ['富山市','高岡市','魚津市','氷見市','滑川市','黒部市','砺波市','小矢部市','南砺市','射水市'],
  '石川県': ['金沢市','七尾市','小松市','輪島市','珠洲市','加賀市','羽咋市','かほく市','白山市','能美市','野々市市'],
  '福井県': ['福井市','敦賀市','小浜市','大野市','勝山市','鯖江市','あわら市','越前市','坂井市'],
  '山梨県': ['甲府市','富士吉田市','都留市','山梨市','大月市','韮崎市','南アルプス市','北杜市','甲斐市','笛吹市','上野原市','甲州市','中央市'],
  '長野県': ['長野市','松本市','上田市','岡谷市','飯田市','諏訪市','須坂市','小諸市','伊那市','駒ヶ根市','中野市','大町市','飯山市','茅野市','塩尻市','佐久市','千曲市','東御市','安曇野市'],
  '岐阜県': ['岐阜市','大垣市','高山市','多治見市','関市','中津川市','美濃市','瑞浪市','羽島市','恵那市','美濃加茂市','土岐市','各務原市','可児市','山県市','瑞穂市','飛騨市','本巣市','郡上市','下呂市','海津市'],
  '静岡県': ['静岡市','浜松市','沼津市','熱海市','三島市','富士宮市','伊東市','島田市','富士市','磐田市','焼津市','掛川市','藤枝市','御殿場市','袋井市','下田市','裾野市','湖西市','伊豆市','御前崎市','菊川市','伊豆の国市','牧之原市'],
  '愛知県': ['名古屋市','豊橋市','岡崎市','一宮市','瀬戸市','半田市','春日井市','豊川市','津島市','碧南市','刈谷市','豊田市','安城市','西尾市','蒲郡市','犬山市','常滑市','江南市','小牧市','稲沢市','新城市','東海市','大府市','知多市','知立市','尾張旭市','高浜市','岩倉市','豊明市','日進市','田原市','愛西市','清須市','北名古屋市','弥富市','みよし市','あま市','長久手市'],
  '三重県': ['津市','四日市市','伊勢市','松阪市','桑名市','鈴鹿市','名張市','尾鷲市','亀山市','鳥羽市','熊野市','いなべ市','志摩市','伊賀市'],
  '滋賀県': ['大津市','彦根市','長浜市','近江八幡市','草津市','守山市','栗東市','甲賀市','野洲市','湖南市','高島市','東近江市','米原市'],
  '京都府': ['京都市','福知山市','舞鶴市','綾部市','宇治市','宮津市','亀岡市','城陽市','向日市','長岡京市','八幡市','京田辺市','京丹後市','南丹市','木津川市'],
  '大阪府': ['大阪市','堺市','岸和田市','豊中市','池田市','吹田市','泉大津市','高槻市','貝塚市','守口市','枚方市','茨木市','八尾市','泉佐野市','富田林市','寝屋川市','河内長野市','松原市','大東市','和泉市','箕面市','柏原市','羽曳野市','門真市','摂津市','高石市','藤井寺市','東大阪市','泉南市','四條畷市','交野市','大阪狭山市','阪南市'],
  '兵庫県': ['神戸市','姫路市','尼崎市','明石市','西宮市','洲本市','芦屋市','伊丹市','相生市','豊岡市','加古川市','赤穂市','西脇市','宝塚市','三木市','高砂市','川西市','小野市','三田市','加西市','丹波篠山市','養父市','丹波市','南あわじ市','朝来市','淡路市','宍粟市','加東市','たつの市'],
  '奈良県': ['奈良市','大和高田市','大和郡山市','天理市','橿原市','桜井市','五條市','御所市','生駒市','香芝市','葛城市','宇陀市'],
  '和歌山県': ['和歌山市','海南市','橋本市','有田市','御坊市','田辺市','新宮市','紀の川市','岩出市'],
  '鳥取県': ['鳥取市','米子市','倉吉市','境港市'],
  '島根県': ['松江市','浜田市','出雲市','益田市','大田市','安来市','江津市','雲南市'],
  '岡山県': ['岡山市','倉敷市','津山市','玉野市','笠岡市','井原市','総社市','高梁市','新見市','備前市','瀬戸内市','赤磐市','真庭市','美作市','浅口市'],
  '広島県': ['広島市','呉市','竹原市','三原市','尾道市','福山市','府中市','三次市','庄原市','大竹市','東広島市','廿日市市','安芸高田市','江田島市'],
  '山口県': ['下関市','宇部市','山口市','萩市','防府市','下松市','岩国市','光市','長門市','柳井市','美祢市','周南市','山陽小野田市'],
  '徳島県': ['徳島市','鳴門市','小松島市','阿南市','吉野川市','阿波市','美馬市','三好市'],
  '香川県': ['高松市','丸亀市','坂出市','善通寺市','観音寺市','さぬき市','東かがわ市','三豊市'],
  '愛媛県': ['松山市','今治市','宇和島市','八幡浜市','新居浜市','西条市','大洲市','伊予市','四国中央市','西予市','東温市'],
  '高知県': ['高知市','室戸市','安芸市','南国市','土佐市','須崎市','宿毛市','土佐清水市','四万十市','香南市','香美市'],
  '福岡県': ['福岡市','北九州市','大牟田市','久留米市','直方市','飯塚市','田川市','柳川市','八女市','筑後市','大川市','行橋市','豊前市','中間市','小郡市','筑紫野市','春日市','大野城市','宗像市','太宰府市','古賀市','福津市','うきは市','宮若市','嘉麻市','朝倉市','みやま市','糸島市','那珂川市'],
  '佐賀県': ['佐賀市','唐津市','鳥栖市','多久市','伊万里市','武雄市','鹿島市','小城市','嬉野市','神埼市'],
  '長崎県': ['長崎市','佐世保市','島原市','諫早市','大村市','平戸市','松浦市','対馬市','壱岐市','五島市','西海市','雲仙市','南島原市'],
  '熊本県': ['熊本市','八代市','人吉市','荒尾市','水俣市','玉名市','山鹿市','菊池市','宇土市','上天草市','宇城市','阿蘇市','天草市','合志市'],
  '大分県': ['大分市','別府市','中津市','日田市','佐伯市','臼杵市','津久見市','竹田市','豊後高田市','杵築市','宇佐市','豊後大野市','由布市','国東市'],
  '宮崎県': ['宮崎市','都城市','延岡市','日南市','小林市','日向市','串間市','西都市','えびの市'],
  '鹿児島県': ['鹿児島市','鹿屋市','枕崎市','阿久根市','出水市','指宿市','西之表市','垂水市','薩摩川内市','日置市','曽於市','霧島市','いちき串木野市','南さつま市','志布志市','奄美市','南九州市','伊佐市','姶良市'],
  '沖縄県': ['那覇市','宜野湾市','石垣市','浦添市','名護市','糸満市','沖縄市','豊見城市','うるま市','宮古島市','南城市'],
}
