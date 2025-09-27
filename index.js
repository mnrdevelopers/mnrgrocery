const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendFamilyNotification = functions.firestore
    .document('items/{itemId}')
    .onCreate(async (snapshot, context) => {
        const item = snapshot.data();
        
        // Don't send notification if item is created without a family
        if (!item.familyId) return null;

        try {
            // Get all family members except the user who added the item
            const familyDoc = await admin.firestore().collection('families').doc(item.familyId).get();
            if (!familyDoc.exists) return null;

            const familyData = familyDoc.data();
            const memberIds = familyData.members.filter(id => id !== item.addedBy);

            if (memberIds.length === 0) return null;

            // Get FCM tokens of family members
            const usersSnapshot = await admin.firestore().collection('users')
                .where(admin.firestore.FieldPath.documentId(), 'in', memberIds)
                .where('notificationEnabled', '==', true)
                .get();

            const tokens = [];
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.fcmToken) {
                    tokens.push(userData.fcmToken);
                }
            });

            if (tokens.length === 0) return null;

            // Determine notification type
            let title, body;
            if (item.isUrgent) {
                title = '🚨 Urgent Item Added';
                body = `${item.addedByName} added urgent item: ${item.name}`;
            } else {
                title = '🛒 New Item Added';
                body = `${item.addedByName} added ${item.name} to the list`;
            }

            // Create notification payload
            const payload = {
                notification: {
                    title: title,
                    body: body,
                    icon: '/icons/icon-192x192.png'
                },
                data: {
                    type: 'new_item',
                    itemId: context.params.itemId,
                    familyId: item.familyId,
                    tab: 'list',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                tokens: tokens
            };

            // Send multicast message to all tokens
            const response = await admin.messaging().sendMulticast(payload);
            
            console.log('Notification sent successfully:', response);
            return response;

        } catch (error) {
            console.error('Error sending notification:', error);
            return null;
        }
    });

exports.sendItemCompletedNotification = functions.firestore
    .document('items/{itemId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if item was just completed
        if (!before.completed && after.completed) {
            try {
                // Get family members except the user who completed the item
                const familyDoc = await admin.firestore().collection('families').doc(after.familyId).get();
                if (!familyDoc.exists) return null;

                const familyData = familyDoc.data();
                const memberIds = familyData.members.filter(id => id !== after.completedBy);

                if (memberIds.length === 0) return null;

                // Get FCM tokens
                const usersSnapshot = await admin.firestore().collection('users')
                    .where(admin.firestore.FieldPath.documentId(), 'in', memberIds)
                    .where('notificationEnabled', '==', true)
                    .get();

                const tokens = [];
                usersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    if (userData.fcmToken) {
                        tokens.push(userData.fcmToken);
                    }
                });

                if (tokens.length === 0) return null;

                const payload = {
                    notification: {
                        title: '✅ Item Purchased',
                        body: `${after.completedByName} purchased ${after.name}`,
                        icon: '/icons/icon-192x192.png'
                    },
                    data: {
                        type: 'item_completed',
                        itemId: context.params.itemId,
                        familyId: after.familyId,
                        tab: 'purchases'
                    },
                    tokens: tokens
                };

                const response = await admin.messaging().sendMulticast(payload);
                console.log('Completion notification sent:', response);
                return response;

            } catch (error) {
                console.error('Error sending completion notification:', error);
                return null;
            }
        }
        return null;
    });

exports.sendItemClaimedNotification = functions.firestore
    .document('items/{itemId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if item was just claimed
        if (!before.claimedBy && after.claimedBy) {
            try {
                const familyDoc = await admin.firestore().collection('families').doc(after.familyId).get();
                if (!familyDoc.exists) return null;

                const familyData = familyDoc.data();
                const memberIds = familyData.members.filter(id => id !== after.claimedBy);

                if (memberIds.length === 0) return null;

                const usersSnapshot = await admin.firestore().collection('users')
                    .where(admin.firestore.FieldPath.documentId(), 'in', memberIds)
                    .where('notificationEnabled', '==', true)
                    .get();

                const tokens = [];
                usersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    if (userData.fcmToken) {
                        tokens.push(userData.fcmToken);
                    }
                });

                if (tokens.length === 0) return null;

                const payload = {
                    notification: {
                        title: '🛍️ Item Claimed',
                        body: `${after.claimedByName} will buy ${after.name}`,
                        icon: '/icons/icon-192x192.png'
                    },
                    data: {
                        type: 'item_claimed',
                        itemId: context.params.itemId,
                        familyId: after.familyId,
                        tab: 'list'
                    },
                    tokens: tokens
                };

                const response = await admin.messaging().sendMulticast(payload);
                console.log('Claim notification sent:', response);
                return response;

            } catch (error) {
                console.error('Error sending claim notification:', error);
                return null;
            }
        }
        return null;
    });
