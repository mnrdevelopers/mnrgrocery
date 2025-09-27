// notifications.js - Enhanced for multi-device notifications
class NotificationManager {
    constructor() {
        this.notificationContainer = null;
        this.notificationSound = null;
        this.userPreferences = {
            notifications: true,
            sound: true,
            itemAdded: true,
            itemCompleted: true,
            priceAdded: true,
            familyActivity: true
        };
        this.currentUserId = null;
        this.currentFamilyId = null;
        this.itemListener = null;
    }

    async init() {
        this.createNotificationContainer();
        this.createNotificationSound();
        await this.loadUserPreferences();
        this.setupFirebaseListeners();
    }

    setUserContext(userId, familyId) {
        this.currentUserId = userId;
        this.currentFamilyId = familyId;
    }

    setupFirebaseListeners() {
        if (!this.currentFamilyId) return;

        // Listen for item changes across the family
        this.itemListener = db.collection('items')
            .where('familyId', '==', this.currentFamilyId)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.handleItemAdded(change.doc.data(), change.doc.id);
                    } else if (change.type === 'modified') {
                        this.handleItemModified(change.doc.data(), change.doc.id, change.doc.previousData());
                    }
                });
            }, (error) => {
                console.error('Error listening to items:', error);
            });
    }

    handleItemAdded(itemData, itemId) {
        // Don't show notification if user added the item themselves
        if (itemData.addedBy === this.currentUserId) return;
        
        if (!itemData.completed && this.userPreferences.itemAdded) {
            this.showItemAddedNotification(itemData.name, itemData.addedByName || 'Family Member');
        }
    }

    handleItemModified(newData, itemId, oldData) {
        // Don't show notification if user modified the item themselves
        if (newData.completedBy === this.currentUserId || 
            newData.claimedBy === this.currentUserId) return;

        // Check if item was just completed
        if (newData.completed && !oldData.completed && this.userPreferences.itemCompleted) {
            this.showItemCompletedNotification(
                newData.name, 
                newData.completedByName || 'Family Member'
            );
        }

        // Check if price was added
        if (newData.price && !oldData.price && this.userPreferences.priceAdded) {
            this.showPriceAddedNotification(newData.name, newData.price);
        }

        // Check if item was claimed
        if (newData.claimedBy && !oldData.claimedBy && this.userPreferences.familyActivity) {
            this.showFamilyActivityNotification(
                newData.claimedByName || 'Family Member', 
                `claimed "${newData.name}"`
            );
        }

        // Check if item was unclaimed
        if (!newData.claimedBy && oldData.claimedBy && this.userPreferences.familyActivity) {
            this.showFamilyActivityNotification(
                oldData.claimedByName || 'Family Member', 
                `unclaimed "${oldData.name}"`
            );
        }
    }

    createNotificationContainer() {
        if (document.getElementById('notificationContainer')) {
            this.notificationContainer = document.getElementById('notificationContainer');
            return;
        }
        
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        this.notificationContainer.id = 'notificationContainer';
        document.body.appendChild(this.notificationContainer);
    }

    createNotificationSound() {
        // Simple beep sound
        this.notificationSound = new Audio();
    }

    async loadUserPreferences() {
        try {
            if (this.currentUserId) {
                const userDoc = await db.collection('users').doc(this.currentUserId).get();
                if (userDoc.exists && userDoc.data().preferences) {
                    this.userPreferences = { ...this.userPreferences, ...userDoc.data().preferences };
                }
            }
        } catch (error) {
            console.log('Using default notification preferences');
        }
    }

    async saveUserPreferences() {
        try {
            if (this.currentUserId) {
                await db.collection('users').doc(this.currentUserId).update({
                    preferences: this.userPreferences
                });
            }
        } catch (error) {
            console.error('Error saving notification preferences:', error);
        }
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        if (!this.userPreferences.notifications) return;

        if (!this.notificationContainer) {
            this.createNotificationContainer();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Use FontAwesome icons if available, otherwise use emoji
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;

        this.notificationContainer.appendChild(notification);

        // Add close event
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Play sound
        if (this.userPreferences.sound) {
            this.playNotificationSound();
        }

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        return notification;
    }

    removeNotification(notification) {
        notification.classList.remove('show');
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        // Check if FontAwesome is available
        if (typeof FontAwesome !== 'undefined') {
            const icons = {
                'success': '<i class="fas fa-check-circle"></i>',
                'error': '<i class="fas fa-exclamation-circle"></i>',
                'warning': '<i class="fas fa-exclamation-triangle"></i>',
                'info': '<i class="fas fa-info-circle"></i>'
            };
            return icons[type] || icons.info;
        } else {
            // Fallback to emoji
            const icons = {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️'
            };
            return icons[type] || icons.info;
        }
    }

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
        } catch (error) {
            // Silent fail if audio context not supported
        }
    }

    // Notification methods for specific events
    showItemAddedNotification(itemName, addedBy) {
        this.showNotification(
            '🛒 New Item Added',
            `${addedBy} added "${itemName}" to the list`,
            'success',
            4000
        );
    }

    showItemCompletedNotification(itemName, completedBy) {
        this.showNotification(
            '✅ Item Purchased',
            `${completedBy} purchased "${itemName}"`,
            'info',
            4000
        );
    }

    showPriceAddedNotification(itemName, price) {
        this.showNotification(
            '💰 Price Added',
            `₹${price} added for "${itemName}"`,
            'success',
            4000
        );
    }

    showFamilyActivityNotification(memberName, action) {
        this.showNotification(
            '👨‍👩‍👧‍👦 Family Activity',
            `${memberName} ${action}`,
            'info',
            4000
        );
    }

    // Test method
    testNotification() {
        this.showNotification(
            '🔔 Test Notification',
            'Notifications are working across all devices!',
            'success',
            4000
        );
    }

    // Cleanup when leaving
    cleanup() {
        if (this.itemListener) {
            this.itemListener();
        }
    }

    // Settings management
    getSettings() {
        return { ...this.userPreferences };
    }

    updateSettings(newSettings) {
        this.userPreferences = { ...this.userPreferences, ...newSettings };
        this.saveUserPreferences();
    }
}

// Global instance
window.notificationManager = new NotificationManager();
