// onesignal-notifications.js - Simple OneSignal integration
class OneSignalManager {
    constructor() {
        this.isInitialized = false;
        this.currentUserId = null;
        this.init();
    }

    async init() {
        if (typeof OneSignal === 'undefined') {
            console.warn('OneSignal SDK not loaded');
            return;
        }

        try {
            // Wait for OneSignal to be ready
            await this.waitForOneSignal();
            
            // Get current user ID
            this.currentUserId = await OneSignal.getUserId();
            console.log('OneSignal User ID:', this.currentUserId);
            
            this.isInitialized = true;
            this.setupEventListeners();
            
            // Save OneSignal ID to user profile
            await this.saveOneSignalIdToProfile();
            
        } catch (error) {
            console.error('OneSignal initialization error:', error);
        }
    }

    waitForOneSignal() {
        return new Promise((resolve) => {
            if (window.OneSignalInitialized) {
                resolve();
            } else {
                OneSignal.push(() => {
                    window.OneSignalInitialized = true;
                    resolve();
                });
            }
        });
    }

    setupEventListeners() {
        // Listen for notification permission changes
        OneSignal.on('notificationPermissionChange', (permission) => {
            console.log('Notification permission changed:', permission);
            this.updateNotificationStatus(permission === 'granted');
        });

        // Listen for subscription changes
        OneSignal.on('subscriptionChange', (isSubscribed) => {
            console.log('Subscription changed:', isSubscribed);
            this.updateNotificationStatus(isSubscribed);
        });

        // Handle notification clicks
        OneSignal.on('notificationDisplay', (event) => {
            console.log('Notification displayed:', event);
        });

        OneSignal.on('notificationDismiss', (event) => {
            console.log('Notification dismissed:', event);
        });
    }

    async saveOneSignalIdToProfile() {
        if (!app || !app.currentUser || !this.currentUserId) return;

        try {
            await db.collection('users').doc(app.currentUser.uid).update({
                oneSignalId: this.currentUserId,
                notificationEnabled: true,
                notificationUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('OneSignal ID saved to user profile');
        } catch (error) {
            console.error('Error saving OneSignal ID:', error);
        }
    }

    async updateNotificationStatus(isEnabled) {
        if (!app || !app.currentUser) return;

        try {
            await db.collection('users').doc(app.currentUser.uid).update({
                notificationEnabled: isEnabled
            });
        } catch (error) {
            console.error('Error updating notification status:', error);
        }
    }

    // Send notification to family members
    async sendToFamily(memberIds, title, message, data = {}) {
        if (!this.isInitialized) {
            console.warn('OneSignal not initialized');
            return;
        }

        try {
            // Get OneSignal IDs of family members
            const oneSignalIds = await this.getFamilyOneSignalIds(memberIds);
            
            if (oneSignalIds.length === 0) {
                console.log('No family members with OneSignal IDs');
                return;
            }

            // Send notification via OneSignal REST API
            await this.sendNotification(oneSignalIds, title, message, data);
            
        } catch (error) {
            console.error('Error sending family notification:', error);
        }
    }

    async getFamilyOneSignalIds(memberIds) {
        const oneSignalIds = [];
        
        for (const memberId of memberIds) {
            try {
                const userDoc = await db.collection('users').doc(memberId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.oneSignalId && userData.notificationEnabled !== false) {
                        oneSignalIds.push(userData.oneSignalId);
                    }
                }
            } catch (error) {
                console.error('Error getting user data:', error);
            }
        }
        
        return oneSignalIds;
    }

    async sendNotification(playerIds, title, message, data = {}) {
        const payload = {
            app_id: OneSignal.config.appId, // Use the same app ID
            include_player_ids: playerIds,
            headings: { en: title },
            contents: { en: message },
            data: data,
            url: window.location.origin + '/app.html', // URL to open when clicked
            chrome_web_icon: '/icons/icon-192x192.png',
            chrome_web_badge: '/icons/badge-72x72.png'
        };

        try {
            const response = await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic scjso5hs7eewm537xkog7pm4b' // Get from OneSignal dashboard
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('Notification sent successfully:', result);
            return result;
            
        } catch (error) {
            console.error('Error sending notification:', error);
            // Fallback to local notification
            this.showLocalNotification(title, message);
        }
    }

    showLocalNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/icons/icon-192x192.png'
            });
        }
    }

    // Notification methods for different events
    async notifyNewItem(item, addedByName) {
        if (!app.currentFamily) return;

        const familyDoc = await db.collection('families').doc(app.currentFamily).get();
        const memberIds = familyDoc.data().members.filter(id => id !== app.currentUser.uid);

        const title = item.isUrgent ? '🚨 Urgent Item Added' : '🛒 New Item Added';
        const message = item.isUrgent 
            ? `${addedByName} added urgent item: ${item.name}`
            : `${addedByName} added ${item.name} to the list`;

        await this.sendToFamily(memberIds, title, message, {
            type: 'new_item',
            itemId: item.id,
            familyId: app.currentFamily,
            tab: 'list'
        });
    }

    async notifyItemCompleted(item, completedByName) {
        if (!app.currentFamily) return;

        const familyDoc = await db.collection('families').doc(app.currentFamily).get();
        const memberIds = familyDoc.data().members.filter(id => id !== app.currentUser.uid);

        await this.sendToFamily(memberIds, '✅ Item Purchased', 
            `${completedByName} purchased ${item.name}`, {
            type: 'item_completed',
            itemId: item.id,
            familyId: app.currentFamily,
            tab: 'purchases'
        });
    }

    async notifyItemClaimed(item, claimedByName) {
        if (!app.currentFamily) return;

        const familyDoc = await db.collection('families').doc(app.currentFamily).get();
        const memberIds = familyDoc.data().members.filter(id => id !== app.currentUser.uid);

        await this.sendToFamily(memberIds, '🛍️ Item Claimed', 
            `${claimedByName} will buy ${item.name}`, {
            type: 'item_claimed',
            itemId: item.id,
            familyId: app.currentFamily,
            tab: 'list'
        });
    }

    // Test notification
    async testNotification() {
        if (!this.isInitialized) {
            Utils.showToast('OneSignal not ready yet');
            return;
        }

        const title = '🔔 Test Notification';
        const message = 'This is a test notification from FamilyGrocer!';

        // Send to yourself as test
        if (this.currentUserId) {
            await this.sendNotification([this.currentUserId], title, message, {
                type: 'test',
                tab: 'settings'
            });
            Utils.showToast('Test notification sent!');
        } else {
            this.showLocalNotification(title, message);
        }
    }

    // Check notification status
    async getNotificationStatus() {
        if (!this.isInitialized) return false;
        
        const isSubscribed = await OneSignal.isPushNotificationsEnabled();
        return isSubscribed;
    }

    // Manually prompt for notifications
    async promptForNotifications() {
        if (!this.isInitialized) return false;
        
        try {
            await OneSignal.showSlidedownPrompt();
            return true;
        } catch (error) {
            console.error('Error showing prompt:', error);
            return false;
        }
    }
}

// Initialize OneSignal manager
let oneSignalManager;

document.addEventListener('DOMContentLoaded', () => {
    oneSignalManager = new OneSignalManager();
});
