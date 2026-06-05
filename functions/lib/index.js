"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushOnNotification = exports.notifyOnNewFoundPet = exports.notifyOnNewSighting = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const expo_server_sdk_1 = require("expo-server-sdk");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const expo = new expo_server_sdk_1.Expo();
// 通知種別とユーザー設定キーのマッピング
const NOTIFICATION_SETTING_KEY = {
    comment: 'comment',
    reply: 'comment',
    sighting_nearby: 'sighting_nearby',
    found_nearby: 'found_nearby',
    best_info_selected: 'best_info_selected',
    points_granted: 'points_granted',
    discovery_bonus: 'discovery_bonus',
    prefecture_sighting: 'sighting_nearby',
};
function buildBody(n) {
    var _a, _b, _c, _d;
    const from = (_a = n.fromUserDisplayName) !== null && _a !== void 0 ? _a : 'ユーザー';
    const pet = (_b = n.petName) !== null && _b !== void 0 ? _b : 'ペット';
    switch (n.type) {
        case 'comment':
            return `${from}さんが「${pet}」にコメントしました`;
        case 'reply':
            return `${from}さんがあなたのコメントに返信しました`;
        case 'sighting_nearby':
            return `「${pet}」の近くで目撃情報が投稿されました`;
        case 'found_nearby':
            return '近くで保護された動物の情報があります';
        case 'prefecture_sighting':
            return `同じ都道府県で目撃情報が投稿されました`;
        case 'best_info_selected':
            return `「${pet}」の最有力情報に選ばれました！ +100pt`;
        case 'points_granted':
            return `${(_c = n.amount) !== null && _c !== void 0 ? _c : 0}ptが付与されました`;
        case 'discovery_bonus':
            return `「${pet}」発見への貢献ボーナスが付与されました！`;
        case 'reward_exchange_requested':
            return `景品「${(_d = n.rewardName) !== null && _d !== void 0 ? _d : ''}」の交換申請を受け付けました`;
        case 'new_matched_sighting_after_edit':
            return `「${pet}」に新しい目撃情報が見つかりました`;
        case 'new_matched_protected_after_edit':
            return `「${pet}」に保護情報が見つかりました`;
        default:
            return 'ANIMAL GO から新しい通知があります';
    }
}
// ハーヴァーサイン距離（km）
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
/**
 * 目撃情報が新規作成されたとき、近隣の迷子投稿者へ通知ドキュメントを作成する。
 * Admin SDK 経由で実行するため、Firestore ルールや認証状態に依存しない。
 */
exports.notifyOnNewSighting = (0, firestore_1.onDocumentCreated)({ document: 'sightings/{sightingId}', region: 'asia-northeast1' }, async (event) => {
    var _a, _b;
    const sightingId = event.params.sightingId;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const location = data.location;
    const species = data.species;
    const sightingUserId = data.userId;
    const title = data.title || '目撃情報';
    // 捜索中の迷子投稿を取得
    const petsSnap = await db.collection('pets')
        .where('type', '==', 'lost')
        .where('status', '==', 'searching')
        .limit(200)
        .get();
    const now = firestore_2.FieldValue.serverTimestamp();
    const batch = db.batch();
    let count = 0;
    for (const petDoc of petsSnap.docs) {
        const pet = petDoc.data();
        if (sightingUserId && pet.userId === sightingUserId)
            continue;
        if (species && pet.species !== species)
            continue;
        const petLoc = pet.location;
        const radiusKm = (_b = pet.searchRadiusKm) !== null && _b !== void 0 ? _b : 5;
        let notifType = null;
        if ((location === null || location === void 0 ? void 0 : location.lat) !== undefined && (location === null || location === void 0 ? void 0 : location.lng) !== undefined &&
            (petLoc === null || petLoc === void 0 ? void 0 : petLoc.lat) !== undefined && (petLoc === null || petLoc === void 0 ? void 0 : petLoc.lng) !== undefined) {
            const dist = haversineKm(location.lat, location.lng, petLoc.lat, petLoc.lng);
            notifType = dist <= radiusKm ? 'sighting_nearby' : null;
            if (!notifType && location.prefecture && petLoc.prefecture && location.prefecture === petLoc.prefecture) {
                notifType = 'prefecture_sighting';
            }
        }
        else if ((location === null || location === void 0 ? void 0 : location.city) && (petLoc === null || petLoc === void 0 ? void 0 : petLoc.city) && location.city === petLoc.city) {
            notifType = 'sighting_nearby';
        }
        else if ((location === null || location === void 0 ? void 0 : location.prefecture) && (petLoc === null || petLoc === void 0 ? void 0 : petLoc.prefecture) && location.prefecture === petLoc.prefecture) {
            notifType = 'prefecture_sighting';
        }
        if (!notifType || !pet.userId)
            continue;
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
            userId: pet.userId,
            type: notifType,
            petId: petDoc.id,
            petName: pet.name || '名前不明',
            sightingId,
            fromUserDisplayName: title,
            isRead: false,
            createdAt: now,
        });
        count++;
        if (count >= 450)
            break; // batch limit 500 に余裕を持たせる
    }
    if (count > 0)
        await batch.commit();
    console.log(`notifyOnNewSighting: ${count} notifications created for sighting ${sightingId}`);
});
/**
 * 保護投稿（type=found）が新規作成されたとき、近隣の迷子投稿者へ通知する。
 * 動物種が一致する場合のみ通知を送る。
 */
exports.notifyOnNewFoundPet = (0, firestore_1.onDocumentCreated)({ document: 'pets/{petId}', region: 'asia-northeast1' }, async (event) => {
    var _a, _b;
    const petId = event.params.petId;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data || data.type !== 'found')
        return; // 保護投稿のみ対象
    const location = data.location;
    const species = data.species;
    const foundUserId = data.userId;
    const petName = data.name || data.description || '保護されたペット';
    // 捜索中の迷子投稿を取得
    const lostPetsSnap = await db.collection('pets')
        .where('type', '==', 'lost')
        .where('status', '==', 'searching')
        .limit(200)
        .get();
    const now = firestore_2.FieldValue.serverTimestamp();
    const batch = db.batch();
    let count = 0;
    for (const lostDoc of lostPetsSnap.docs) {
        const lostPet = lostDoc.data();
        if (foundUserId && lostPet.userId === foundUserId)
            continue;
        if (species && lostPet.species !== species)
            continue; // 動物種が一致する場合のみ
        const petLoc = lostPet.location;
        const radiusKm = (_b = lostPet.searchRadiusKm) !== null && _b !== void 0 ? _b : 5;
        let notifType = null;
        if ((location === null || location === void 0 ? void 0 : location.lat) !== undefined && (location === null || location === void 0 ? void 0 : location.lng) !== undefined &&
            (petLoc === null || petLoc === void 0 ? void 0 : petLoc.lat) !== undefined && (petLoc === null || petLoc === void 0 ? void 0 : petLoc.lng) !== undefined) {
            const dist = haversineKm(location.lat, location.lng, petLoc.lat, petLoc.lng);
            notifType = dist <= radiusKm ? 'found_nearby' : null;
            if (!notifType && location.prefecture && petLoc.prefecture && location.prefecture === petLoc.prefecture) {
                notifType = 'found_nearby'; // 同都道府県でも通知
            }
        }
        else if ((location === null || location === void 0 ? void 0 : location.city) && (petLoc === null || petLoc === void 0 ? void 0 : petLoc.city) && location.city === petLoc.city) {
            notifType = 'found_nearby';
        }
        else if ((location === null || location === void 0 ? void 0 : location.prefecture) && (petLoc === null || petLoc === void 0 ? void 0 : petLoc.prefecture) && location.prefecture === petLoc.prefecture) {
            notifType = 'found_nearby';
        }
        if (!notifType || !lostPet.userId)
            continue;
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
            userId: lostPet.userId,
            type: notifType,
            petId: lostDoc.id,
            petName: lostPet.name || '名前不明',
            sightingId: petId, // 保護投稿IDを参照
            fromUserDisplayName: petName,
            isRead: false,
            createdAt: now,
        });
        count++;
        if (count >= 450)
            break;
    }
    if (count > 0)
        await batch.commit();
    console.log(`notifyOnNewFoundPet: ${count} notifications created for found pet ${petId}`);
});
exports.sendPushOnNotification = (0, firestore_1.onDocumentCreated)({ document: 'notifications/{notificationId}', region: 'asia-northeast1' }, async (event) => {
    var _a, _b, _c, _d;
    const n = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!(n === null || n === void 0 ? void 0 : n.userId))
        return;
    const userSnap = await db.doc(`users/${n.userId}`).get();
    const userData = (_b = userSnap.data()) !== null && _b !== void 0 ? _b : {};
    // 通知種別ごとのON/OFF設定チェック
    const notifSettings = ((_c = userData.notificationSettings) !== null && _c !== void 0 ? _c : {});
    const settingKey = NOTIFICATION_SETTING_KEY[n.type];
    if (settingKey !== undefined && notifSettings[settingKey] === false)
        return;
    const tokens = ((_d = userData.expoPushTokens) !== null && _d !== void 0 ? _d : []);
    const validTokens = tokens.filter((t) => expo_server_sdk_1.Expo.isExpoPushToken(t));
    if (validTokens.length === 0)
        return;
    const body = buildBody(n);
    const messages = validTokens.map((to) => ({
        to,
        title: 'ANIMAL GO',
        body,
        sound: 'default',
        data: { petId: n.petId },
    }));
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            const receipts = await expo.sendPushNotificationsAsync(chunk);
            console.log('Push receipts:', receipts);
        }
        catch (err) {
            console.error('Push notification error:', err);
        }
    }
});
//# sourceMappingURL=index.js.map