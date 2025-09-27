// simple-notifications.js - Simple, reliable in-app notifications
class SimpleNotifications {
    constructor() {
        this.notificationContainer = null;
        this.notificationCount = 0;
        this.maxNotifications = 5;
        this.setupNotificationContainer();
        this.setupFirestoreListeners();
    }

    setupNotificationContainer() {
        // Create notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'inAppNotifications';
        this.notificationContainer.className = 'in-app-notifications';
        document.body.appendChild(this.notificationContainer);
    }

    setupFirestoreListeners() {
        // This will be called when the app is initialized
        console.log('Notification system ready - Firestore listeners will be set up when app loads');
    }

    initializeWithApp(appInstance) {
        this.app = appInstance;
        this.setupRealTimeListeners();
    }

    setupRealTimeListeners() {
        if (!this.app.currentFamily) return;

        console.log('Setting up real-time notification listeners for family:', this.app.currentFamily);

        // Listen for new items added by family members
        db.collection('items')
            .where('familyId', '==', this.app.currentFamily)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const item = change.doc.data();
                        // Don't notify for user's own items
                        if (item.addedBy !== this.app.currentUser.uid) {
                            this.showInAppNotification(
                                '🛒 New Item',
                                `${item.addedByName} added: ${item.name}`,
                                'info',
                                'list'
                            );
                        }
                    }

                    if (change.type === 'modified') {
                        const newData = change.doc.data();
                        const oldData = change.doc.previous.data();

                        // Item completed
                        if (!oldData.completed && newData.completed) {
                            if (newData.completedBy !== this.app.currentUser.uid) {
                                this.showInAppNotification(
                                    '✅ Item Purchased',
                                    `${newData.completedByName} purchased: ${newData.name}`,
                                    'success',
                                    'purchases'
                                );
                            }
                        }

                        // Item claimed
                        if (!oldData.claimedBy && newData.claimedBy) {
                            if (newData.claimedBy !== this.app.currentUser.uid) {
                                this.showInAppNotification(
                                    '🛍️ Item Claimed',
                                    `${newData.claimedByName} will buy: ${newData.name}`,
                                    'warning',
                                    'list'
                                );
                            }
                        }

                        // Item unclaimed
                        if (oldData.claimedBy && !newData.claimedBy) {
                            if (oldData.claimedBy !== this.app.currentUser.uid) {
                                this.showInAppNotification(
                                    '📦 Item Available',
                                    `${oldData.claimedByName} can no longer buy: ${newData.name}`,
                                    'info',
                                    'list'
                                );
                            }
                        }
                    }
                });
            });

        // Listen for urgent items
        db.collection('items')
            .where('familyId', '==', this.app.currentFamily)
            .where('isUrgent', '==', true)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const item = change.doc.data();
                        if (item.addedBy !== this.app.currentUser.uid) {
                            this.showInAppNotification(
                                '🚨 Urgent Item!',
                                `${item.addedByName} added urgent item: ${item.name}`,
                                'urgent',
                                'list'
                            );
                        }
                    }
                });
            });
    }

    showInAppNotification(title, message, type = 'info', tab = null) {
        this.notificationCount++;

        // Remove oldest notification if we have too many
        if (this.notificationContainer.children.length >= this.maxNotifications) {
            this.notificationContainer.removeChild(this.notificationContainer.firstChild);
        }

        const notification = document.createElement('div');
        notification.className = `in-app-notification in-app-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${title}</span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="notification-message">${message}</div>
                <div class="notification-time">${this.getCurrentTime()}</div>
            </div>
        `;

        // Add click handler to switch tabs
        if (tab && this.app && this.app.switchTab) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', () => {
                this.app.switchTab(tab);
                notification.remove();
            });
        }

        this.notificationContainer.appendChild(notification);

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 8000);

        // Add entrance animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Show browser notification if app is not focused
        this.showBrowserNotification(title, message, tab);
    }

    showBrowserNotification(title, message, tab = null) {
        // Only show browser notification if the page is not focused
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: message,
                icon: '/FamilyGrocer/icons/icon-192x192.png',
                tag: 'familygrocer'
            });

            notification.onclick = () => {
                window.focus();
                if (tab && this.app && this.app.switchTab) {
                    this.app.switchTab(tab);
                }
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        }
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Manual notification methods
    notifyNewItem(item, addedByName) {
        const title = item.isUrgent ? '🚨 Urgent Item Added' : '🛒 New Item Added';
        const message = item.isUrgent 
            ? `${addedByName} added urgent item: ${item.name}`
            : `${addedByName} added ${item.name} to the list`;
        const type = item.isUrgent ? 'urgent' : 'info';

        this.showInAppNotification(title, message, type, 'list');
    }

    notifyItemCompleted(item, completedByName) {
        this.showInAppNotification(
            '✅ Item Purchased',
            `${completedByName} purchased ${item.name}`,
            'success',
            'purchases'
        );
    }

    notifyItemClaimed(item, claimedByName) {
        this.showInAppNotification(
            '🛍️ Item Claimed',
            `${claimedByName} will buy ${item.name}`,
            'warning',
            'list'
        );
    }

    // Test notification
    testNotification() {
        this.showInAppNotification(
            '🔔 Test Notification',
            'This is a test notification from FamilyGrocer!',
            'info',
            'settings'
        );
    }

    // Request browser notification permission
    async requestBrowserPermission() {
        if (!('Notification' in window)) {
            Utils.showToast('Browser notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission === 'denied') {
            Utils.showToast('Notifications blocked. Please enable them in browser settings.');
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            Utils.showToast('Browser notifications enabled!');
            return true;
        } else {
            Utils.showToast('Notifications permission denied');
            return false;
        }
    }

    // Clear all notifications
    clearAll() {
        this.notificationContainer.innerHTML = '';
        this.notificationCount = 0;
    }
}

// Global notification instance
let simpleNotifications;

document.addEventListener('DOMContentLoaded', () => {
    simpleNotifications = new SimpleNotifications();
});
