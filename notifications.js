// notifications.js - Push Notification Manager
class NotificationManager {
    constructor() {
        this.isSupported = 'Notification' in window;
        this.permission = null;
        this.currentToken = null;
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Notifications not supported in this browser');
            return;
        }

        this.permission = Notification.permission;
        await this.checkFirebaseReady();
        this.setupEventListeners();
        
        if (this.permission === 'default') {
            await this.requestPermission();
        } else if (this.permission === 'granted') {
            await this.getToken();
        }
    }

    async checkFirebaseReady() {
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (typeof firebase !== 'undefined' && firebase.messaging) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    setupEventListeners() {
        // Listen for foreground messages
        if (messaging) {
            messaging.onMessage((payload) => {
                console.log('Foreground message received:', payload);
                this.showLocalNotification(payload);
            });
        }

        // Listen for token refresh
        if (messaging) {
            messaging.onTokenRefresh(() => {
                this.getToken();
            });
        }
    }

    async requestPermission() {
        if (!this.isSupported) return false;

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                await this.getToken();
                Utils.showToast('Notifications enabled!');
                return true;
            } else {
                Utils.showToast('Notifications blocked');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    async getToken() {
        if (!messaging || this.permission !== 'granted') return null;

        try {
            // Request notification permission for Firebase
            await messaging.requestPermission();
            
            // Get FCM token
            const token = await messaging.getToken({
                vapidKey: 'BIouHaUkC-P9N291LKU4ieL8NMMDYDzIovWnXYAs2XyaqxOHS8YFWAcXBBSBmU-5rYTyjHDhR5UqWGS0BoWvRD4' // You can generate this in Firebase Console
            });

            if (token) {
                this.currentToken = token;
                await this.saveTokenToFirestore(token);
                console.log('FCM Token:', token);
                return token;
            } else {
                console.warn('No registration token available');
                return null;
            }
        } catch (error) {
            console.error('Error getting FCM token:', error);
            
            if (error.code === 'messaging/permission-default') {
                console.log('User dismissed permission request');
            } else if (error.code === 'messaging/permission-blocked') {
                console.log('User blocked notifications');
            }
            
            return null;
        }
    }

    async saveTokenToFirestore(token) {
        if (!app.currentUser) return;

        try {
            await db.collection('users').doc(app.currentUser.uid).update({
                fcmToken: token,
                notificationEnabled: true,
                tokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving FCM token:', error);
        }
    }

    async removeTokenFromFirestore() {
        if (!app.currentUser) return;

        try {
            await db.collection('users').doc(app.currentUser.uid).update({
                fcmToken: null,
                notificationEnabled: false
            });
        } catch (error) {
            console.error('Error removing FCM token:', error);
        }
    }

    showLocalNotification(payload) {
        if (!this.isSupported || this.permission !== 'granted') return;

        const { title, body, icon } = payload.notification;
        
        const notification = new Notification(title, {
            body: body,
            icon: icon || '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: 'familygrocer',
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Handle notification click (e.g., navigate to specific tab)
            if (payload.data && payload.data.tab) {
                app.switchTab(payload.data.tab);
            }
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
    }

    async sendNotificationToFamily(memberIds, notificationData) {
        if (!app.currentFamily) return;

        try {
            // Get FCM tokens of family members
            const usersSnapshot = await db.collection('users')
                .where('familyId', '==', app.currentFamily)
                .where('notificationEnabled', '==', true)
                .get();

            const tokens = [];
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.fcmToken && memberIds.includes(doc.id)) {
                    tokens.push(userData.fcmToken);
                }
            });

            if (tokens.length === 0) return;

            // Send notification via Cloud Functions (you'll need to set this up)
            await this.sendViaCloudFunctions(tokens, notificationData);
            
        } catch (error) {
            console.error('Error sending notification to family:', error);
        }
    }

    async sendViaCloudFunctions(tokens, notificationData) {
        // This would call your Cloud Function
        // You need to set up a Cloud Function to send notifications
        console.log('Would send notification to tokens:', tokens, 'with data:', notificationData);
        
        // For now, we'll just show a local notification
        this.showLocalNotification({
            notification: notificationData
        });
    }

    // Notification types for different events
    async notifyItemAdded(item, addedByName) {
        const notificationData = {
            title: '🛒 New Item Added',
            body: `${addedByName} added ${item.name} to the list`,
            data: { tab: 'list' }
        };

        if (app.currentFamily) {
            // Get all family members except the current user
            const familyDoc = await db.collection('families').doc(app.currentFamily).get();
            const memberIds = familyDoc.data().members.filter(id => id !== app.currentUser.uid);
            
            await this.sendNotificationToFamily(memberIds, notificationData);
        }
    }

    async notifyItemCompleted(item, completedByName) {
        const notificationData = {
            title: '✅ Item Purchased',
            body: `${completedByName} purchased ${item.name}`,
            data: { tab: 'purchases' }
        };

        if (app.currentFamily) {
            const familyDoc = await db.collection('families').doc(app.currentFamily).get();
            const memberIds = familyDoc.data().members.filter(id => id !== app.currentUser.uid);
            
            await this.sendNotificationToFamily(memberIds, notificationData);
        }
    }

    async notifyItemClaimed(item, claimedByName) {
        const notificationData = {
            title: '🛍️ Item Claimed',
            body: `${claimedByName} will buy ${item.name}`,
            data: { tab: 'list' }
        };

        if (app.currentFamily) {
            const familyDoc = await db.collection('families').doc(app.currentFamily).get();
            const memberIds = familyDoc.data().members.filter(id => id !== app.currentUser.uid);
            
            await this.sendNotificationToFamily(memberIds, notificationData);
        }
    }

    async notifyUrgentItem(item, addedByName) {
        const notificationData = {
            title: '🚨 Urgent Item Added',
            body: `${addedByName} added urgent item: ${item.name}`,
            data: { tab: 'list' }
        };

        if (app.currentFamily) {
            const familyDoc = await db.collection('families').doc(app.currentFamily).get();
            const memberIds = familyDoc.data().members;
            
            await this.sendNotificationToFamily(memberIds, notificationData);
        }
    }

    async enableNotifications() {
        const enabled = await this.requestPermission();
        if (enabled && app.currentUser) {
            await db.collection('users').doc(app.currentUser.uid).update({
                notificationEnabled: true
            });
        }
        return enabled;
    }

    async disableNotifications() {
        this.permission = 'denied';
        
        if (app.currentUser) {
            await db.collection('users').doc(app.currentUser.uid).update({
                notificationEnabled: false,
                fcmToken: null
            });
        }
        
        Utils.showToast('Notifications disabled');
    }

    async getNotificationStatus() {
        if (!app.currentUser) return false;

        try {
            const userDoc = await db.collection('users').doc(app.currentUser.uid).get();
            return userDoc.exists ? userDoc.data().notificationEnabled : false;
        } catch (error) {
            console.error('Error getting notification status:', error);
            return false;
        }
    }
}

// Initialize notification manager
let notificationManager;
document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
});
