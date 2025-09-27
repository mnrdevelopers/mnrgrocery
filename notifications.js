// notifications.js - Fixed version
class NotificationManager {
    constructor() {
        this.isSupported = this.checkSupport();
        this.permission = null;
        this.currentToken = null;
        this.init();
    }

    checkSupport() {
        return 'Notification' in window && 
               'serviceWorker' in navigator && 
               'PushManager' in window;
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Notifications not supported in this browser');
            return;
        }

        this.permission = Notification.permission;
        await this.setupServiceWorker();
        
        if (this.permission === 'granted') {
            await this.getToken();
        }
    }

    async setupServiceWorker() {
        try {
            // Use a more specific service worker scope
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });
            console.log('Service Worker registered:', registration);
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            Utils.showToast('Notifications not supported in your browser');
            return false;
        }

        try {
            // Request browser permission first
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                // Then request Firebase permission
                await messaging.requestPermission();
                const token = await this.getToken();
                
                if (token) {
                    Utils.showToast('Notifications enabled!');
                    return true;
                } else {
                    Utils.showToast('Failed to enable notifications');
                    return false;
                }
            } else {
                Utils.showToast('Notifications blocked');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            
            if (error.code === 'messaging/permission-blocked') {
                Utils.showToast('Notifications are blocked. Please enable them in browser settings.');
            }
            
            return false;
        }
    }

    async getToken() {
        if (!this.isSupported || !messaging) {
            console.warn('Messaging not available');
            return null;
        }

        try {
            // Get the current token
            const currentToken = await messaging.getToken();
            
            if (currentToken) {
                this.currentToken = currentToken;
                await this.saveTokenToFirestore(currentToken);
                console.log('FCM Token obtained:', currentToken);
                return currentToken;
            } else {
                // Need to generate a new token
                console.log('No registration token available. Requesting permission...');
                return null;
            }
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    }

    async saveTokenToFirestore(token) {
        if (!app || !app.currentUser) return;

        try {
            await db.collection('users').doc(app.currentUser.uid).update({
                fcmToken: token,
                notificationEnabled: true,
                tokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Token saved to Firestore');
        } catch (error) {
            console.error('Error saving FCM token to Firestore:', error);
        }
    }

    async removeTokenFromFirestore() {
        if (!app || !app.currentUser) return;

        try {
            await db.collection('users').doc(app.currentUser.uid).update({
                fcmToken: null,
                notificationEnabled: false
            });
            console.log('Token removed from Firestore');
        } catch (error) {
            console.error('Error removing FCM token:', error);
        }
    }

    // Improved local notification method
    showLocalNotification(payload) {
        if (!this.isSupported || this.permission !== 'granted') {
            console.warn('Cannot show notification: permission not granted');
            return;
        }

        const { title, body, icon } = payload.notification || payload;
        
        const notificationOptions = {
            body: body,
            icon: icon || '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: 'familygrocer',
            requireInteraction: false,
            actions: [
                {
                    action: 'view',
                    title: 'View List'
                }
            ]
        };

        // Show notification
        if ('showNotification' in ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, notificationOptions);
            });
        } else {
            // Fallback for browsers that don't support service worker notifications
            const notification = new Notification(title, notificationOptions);
            this.setupNotificationClick(notification, payload.data);
        }
    }

    setupNotificationClick(notification, data) {
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            
            if (data && data.tab) {
                // Navigate to the specified tab
                if (app && app.switchTab) {
                    app.switchTab(data.tab);
                }
            }
            
            notification.close();
        };
    }

    // Test notification method
    async testNotification() {
        if (!this.isSupported) {
            Utils.showToast('Notifications not supported in your browser');
            return;
        }

        if (this.permission !== 'granted') {
            const enabled = await this.requestPermission();
            if (!enabled) return;
        }

        this.showLocalNotification({
            notification: {
                title: '🔔 Test Notification',
                body: 'This is a test notification from FamilyGrocer!',
                icon: '/icons/icon-192x192.png'
            },
            data: {
                tab: 'settings',
                type: 'test'
            }
        });
    }

    // Check if notifications are enabled
    async checkNotificationStatus() {
        if (!app || !app.currentUser) return false;

        try {
            const userDoc = await db.collection('users').doc(app.currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                return userData.notificationEnabled === true && this.permission === 'granted';
            }
            return false;
        } catch (error) {
            console.error('Error checking notification status:', error);
            return false;
        }
    }

    // Enable/disable notifications
    async enableNotifications() {
        return await this.requestPermission();
    }

    async disableNotifications() {
        this.permission = 'denied';
        await this.removeTokenFromFirestore();
        Utils.showToast('Notifications disabled');
    }
}

// Initialize when app is ready
let notificationManager;

function initNotificationManager() {
    if (typeof app !== 'undefined' && app.currentUser) {
        notificationManager = new NotificationManager();
    } else {
        // Wait for app to be ready
        setTimeout(initNotificationManager, 1000);
    }
}

document.addEventListener('DOMContentLoaded', initNotificationManager);
