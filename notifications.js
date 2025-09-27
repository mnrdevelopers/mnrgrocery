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
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.createNotificationSound();
        this.loadUserPreferences();
    }

    createNotificationContainer() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        this.notificationContainer.id = 'notificationContainer';
        document.body.appendChild(this.notificationContainer);
    }

    createNotificationSound() {
        this.notificationSound = document.createElement('audio');
        this.notificationSound.className = 'notification-sound';
        
        // Create a simple notification sound using Web Audio API
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
            console.log('Web Audio API not supported, using fallback sound');
        }
    }

    async loadUserPreferences() {
        if (app && app.currentUser) {
            try {
                const userDoc = await db.collection('users').doc(app.currentUser.uid).get();
                if (userDoc.exists && userDoc.data().preferences) {
                    this.userPreferences = { ...this.userPreferences, ...userDoc.data().preferences };
                }
            } catch (error) {
                console.error('Error loading notification preferences:', error);
            }
        }
    }

    async saveUserPreferences() {
        if (app && app.currentUser) {
            try {
                await db.collection('users').doc(app.currentUser.uid).update({
                    preferences: this.userPreferences
                });
            } catch (error) {
                console.error('Error saving notification preferences:', error);
            }
        }
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        if (!this.userPreferences.notifications) return;

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
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.notificationContainer.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Play sound if enabled
        if (this.userPreferences.sound) {
            this.playNotificationSound();
        }

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                notification.classList.add('hide');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }

        return notification;
    }

    getNotificationIcon(type) {
        const icons = {
            'success': '<i class="fas fa-check-circle"></i>',
            'error': '<i class="fas fa-exclamation-circle"></i>',
            'warning': '<i class="fas fa-exclamation-triangle"></i>',
            'info': '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    playNotificationSound() {
        if (this.notificationSound) {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(e => console.log('Sound play failed:', e));
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

// Initialize notification manager
let notificationManager;

document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
});
