"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushOnNotification = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const expo_server_sdk_1 = require("expo-server-sdk");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const expo = new expo_server_sdk_1.Expo();
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
exports.sendPushOnNotification = (0, firestore_1.onDocumentCreated)({ document: 'notifications/{notificationId}', region: 'asia-northeast1' }, async (event) => {
    var _a, _b, _c;
    const n = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!(n === null || n === void 0 ? void 0 : n.userId))
        return;
    const userSnap = await db.doc(`users/${n.userId}`).get();
    const tokens = ((_c = (_b = userSnap.data()) === null || _b === void 0 ? void 0 : _b.expoPushTokens) !== null && _c !== void 0 ? _c : []);
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