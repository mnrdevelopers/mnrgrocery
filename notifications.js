// notifications.js - In-app notification system
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
    }

    async init() {
        this.createNotificationContainer();
        this.createNotificationSound();
        await this.loadUserPreferences();
    }

    createNotificationContainer() {
        // Check if container already exists
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
        // Simple notification sound using HTML5 audio (fallback)
        this.notificationSound = new Audio();
        // You can add a subtle notification sound file here if needed
    }

    async loadUserPreferences() {
        try {
            // Wait for app to be available
            if (typeof app !== 'undefined' && app.currentUser) {
                const userDoc = await db.collection('users').doc(app.currentUser.uid).get();
                if (userDoc.exists && userDoc.data().preferences) {
                    this.userPreferences = { ...this.userPreferences, ...userDoc.data().preferences };
                }
            }
        } catch (error) {
            console.log('Could not load user preferences:', error);
            // Use default preferences
        }
    }

    async saveUserPreferences() {
        try {
            if (typeof app !== 'undefined' && app.currentUser) {
                await db.collection('users').doc(app.currentUser.uid).update({
                    preferences: this.userPreferences
                });
            }
        } catch (error) {
            console.error('Error saving notification preferences:', error);
        }
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        if (!this.userPreferences.notifications) return;

        // Ensure container exists
        if (!this.notificationContainer) {
            this.createNotificationContainer();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                ${this.getNotificationIcon(type)}
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;

        this.notificationContainer.appendChild(notification);

        // Add close event listener
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Play sound if enabled
        if (this.userPreferences.sound) {
            this.playNotificationSound();
        }

        // Auto remove after duration
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
        const icons = {
            'success': '✓',
            'error': '⚠',
            'warning': '⚠',
            'info': 'ℹ'
        };
        return icons[type] || icons.info;
    }

    playNotificationSound() {
        // Simple beep sound using Web Audio API
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
            // Fallback: try to play HTML5 audio if available
            if (this.notificationSound) {
                this.notificationSound.play().catch(() => {
                    // Silent fail if audio can't play
                });
            }
        }
    }

    // Specific notification types
    showItemAddedNotification(itemName, addedBy) {
        if (!this.userPreferences.itemAdded) return;
        this.showNotification(
            'New Item Added',
            `${addedBy} added "${itemName}" to the list`,
            'success',
            3000
        );
    }

    showItemCompletedNotification(itemName, completedBy) {
        if (!this.userPreferences.itemCompleted) return;
        this.showNotification(
            'Item Purchased',
            `${completedBy} purchased "${itemName}"`,
            'info',
            3000
        );
    }

    showPriceAddedNotification(itemName, price) {
        if (!this.userPreferences.priceAdded) return;
        this.showNotification(
            'Price Added',
            `₹${price} added for "${itemName}"`,
            'success',
            3000
        );
    }

    showFamilyActivityNotification(memberName, action) {
        if (!this.userPreferences.familyActivity) return;
        this.showNotification(
            'Family Activity',
            `${memberName} ${action}`,
            'info',
            3000
        );
    }

    showLowStockNotification(itemName) {
        this.showNotification(
            'Low Stock Alert',
            `"${itemName}" is running low. Consider adding to your list.`,
            'warning',
            5000
        );
    }

    // Test notification
    testNotification() {
        this.showNotification(
            'Test Notification',
            'This is a test of the notification system. Everything is working correctly!',
            'success',
            3000
        );
    }

    // Toggle notification settings
    toggleNotificationSetting(setting) {
        this.userPreferences[setting] = !this.userPreferences[setting];
        this.saveUserPreferences();
        return this.userPreferences[setting];
    }

    // Get current settings
    getSettings() {
        return { ...this.userPreferences };
    }

    // Update settings
    updateSettings(newSettings) {
        this.userPreferences = { ...this.userPreferences, ...newSettings };
        this.saveUserPreferences();
    }
}

// Global notification manager instance
window.notificationManager = new NotificationManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await window.notificationManager.init();
});
