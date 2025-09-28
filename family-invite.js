// Family Invite and Account Management Functions
class FamilyInviteManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Invite family member buttons
        const inviteMemberBtn = document.getElementById('inviteMemberBtn');
        const whatsappInviteBtn = document.getElementById('whatsappInviteBtn');
        const shareCodeBtn = document.getElementById('shareCodeBtn');
        const shareLinkBtn = document.getElementById('shareLinkBtn');
        
        // Account management buttons
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');

        if (inviteMemberBtn) inviteMemberBtn.addEventListener('click', () => this.inviteFamilyMember());
        if (whatsappInviteBtn) whatsappInviteBtn.addEventListener('click', () => this.shareViaWhatsApp());
        if (shareCodeBtn) shareCodeBtn.addEventListener('click', () => this.copyFamilyCode());
        if (shareLinkBtn) shareLinkBtn.addEventListener('click', () => this.copyInviteLink());
        if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
    }

    // Main invite method with multiple options
    async inviteFamilyMember() {
        if (!this.app.currentFamily) {
            Utils.showToast('No family group found');
            return;
        }

        const inviteOptions = `
Invite Family Members via:

1. 📱 WhatsApp
2. 📋 Copy Family Code
3. 🔗 Copy Invite Link
4. 📧 Email
5. ❌ Cancel

Choose an option (1-4):
        `.trim();

        const choice = prompt(inviteOptions);

        switch (choice) {
            case '1':
                await this.shareViaWhatsApp();
                break;
            
            case '2':
                await this.copyFamilyCode();
                break;
            
            case '3':
                await this.copyInviteLink();
                break;
            
            case '4':
                await this.sendEmailInvite();
                break;
            
            default:
                Utils.showToast('Invitation cancelled');
        }
    }

    // WhatsApp sharing functionality
    async shareViaWhatsApp() {
        if (!this.app.currentFamily) {
            Utils.showToast('No family group found');
            return;
        }

        // Get family name for personalization
        let familyName = 'Our Family';
        let userName = 'Your Family Member';
        
        try {
            const familyDoc = await db.collection('families').doc(this.app.currentFamily).get();
            if (familyDoc.exists) {
                familyName = familyDoc.data().name || 'Our Family';
            }

            const userDoc = await db.collection('users').doc(this.app.currentUser.uid).get();
            if (userDoc.exists && userDoc.data().name) {
                userName = userDoc.data().name;
            }
        } catch (error) {
            console.log('Could not fetch family or user details');
        }

        const message = `🏠 *FamilyGrocer Invitation* 🛒\n\n` +
                       `Hi! ${userName} has invited you to join *${familyName}* on FamilyGrocer!\n\n` +
                       `*Family Code:* \`${this.app.currentFamily}\`\n\n` +
                       `*How to join:*\n` +
                       `1. Open FamilyGrocer app\n` +
                       `2. Tap "Join Family"\n` +
                       `3. Enter this code: *${this.app.currentFamily}*\n\n` +
                       `Let's make shopping easier together! 🎉\n\n` +
                       `_Sent via FamilyGrocer_`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        
        // Detect if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Open WhatsApp directly on mobile
            window.location.href = whatsappUrl;
        } else {
            // Open in new tab on desktop
            const newWindow = window.open(whatsappUrl, '_blank');
            
            // Fallback if popup is blocked
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                await Utils.copyToClipboard(message);
                Utils.showToast('WhatsApp blocked. Message copied to clipboard!');
            }
        }
        
        Utils.showToast('Opening WhatsApp with invitation...');
    }

    // Copy family code to clipboard
    async copyFamilyCode() {
        if (!this.app.currentFamily) {
            Utils.showToast('No family group found');
            return;
        }

        const success = await Utils.copyToClipboard(this.app.currentFamily);
        
        if (success) {
            Utils.showToast('Family code copied to clipboard!');
        } else {
            Utils.showToast('Failed to copy code. Please copy manually: ' + this.app.currentFamily);
        }
    }

    // Copy invite link to clipboard
    async copyInviteLink() {
        if (!this.app.currentFamily) {
            Utils.showToast('No family group found');
            return;
        }

        const inviteLink = `${window.location.origin}?family=${this.app.currentFamily}`;
        const success = await Utils.copyToClipboard(inviteLink);
        
        if (success) {
            Utils.showToast('Invite link copied to clipboard!');
        } else {
            Utils.showToast('Failed to copy link. Please copy manually: ' + inviteLink);
        }
    }

    // Email invite functionality
    async sendEmailInvite() {
        if (!this.app.currentFamily) {
            Utils.showToast('No family group found');
            return;
        }

        const email = prompt('Enter family member\'s email address:');
        if (!email) return;

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Please enter a valid email address');
            return;
        }

        // Get family and user details for personalization
        let familyName = 'Our Family';
        let userName = 'Your Family Member';
        
        try {
            const familyDoc = await db.collection('families').doc(this.app.currentFamily).get();
            if (familyDoc.exists) {
                familyName = familyDoc.data().name || 'Our Family';
            }

            const userDoc = await db.collection('users').doc(this.app.currentUser.uid).get();
            if (userDoc.exists && userDoc.data().name) {
                userName = userDoc.data().name;
            }
        } catch (error) {
            console.log('Could not fetch family or user details');
        }

        const subject = `Join ${familyName} on FamilyGrocer!`;
        const body = `Hi!

${userName} has invited you to join ${familyName} on FamilyGrocer!

Family Code: ${this.app.currentFamily}

To join:
1. Open the FamilyGrocer app
2. Tap "Join Family" 
3. Enter this code: ${this.app.currentFamily}

Let's make shopping easier together!

Best regards,
FamilyGrocer Team`;

        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        
        Utils.showToast('Email client opened with invitation details');
    }

    // Delete account functionality
    async deleteAccount() {
        if (!this.app.currentUser) {
            Utils.showToast('No user logged in');
            return;
        }

        // First confirmation
        if (!confirm('⚠️ DANGER: Permanent Account Deletion\n\n' +
                    'This will permanently:\n' +
                    '• Delete your account\n' +
                    '• Remove you from your family\n' +
                    '• Delete all items you added\n' +
                    '• Remove your purchase history\n\n' +
                    'This action CANNOT be undone!\n\n' +
                    'Are you absolutely sure you want to continue?')) {
            Utils.showToast('Account deletion cancelled');
            return;
        }

        // Second confirmation with typing
        const confirmation = prompt('To confirm, please type "DELETE MY ACCOUNT" exactly as shown:');
        if (confirmation !== 'DELETE MY ACCOUNT') {
            Utils.showToast('Account deletion cancelled. Text did not match.');
            return;
        }

        Utils.showToast('Starting account deletion process...', 'danger');

        try {
            // Step 1: Remove user from family
            if (this.app.currentFamily) {
                try {
                    await db.collection('families').doc(this.app.currentFamily).update({
                        members: firebase.firestore.FieldValue.arrayRemove(this.app.currentUser.uid)
                    });
                    console.log('Removed user from family');
                } catch (error) {
                    console.warn('Error removing user from family:', error);
                }
            }

            // Step 2: Delete all items added by this user
            try {
                const userItemsQuery = await db.collection('items')
                    .where('familyId', '==', this.app.currentFamily)
                    .where('addedBy', '==', this.app.currentUser.uid)
                    .get();

                if (!userItemsQuery.empty) {
                    const batch = db.batch();
                    userItemsQuery.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log(`Deleted ${userItemsQuery.size} items added by user`);
                }
            } catch (error) {
                console.warn('Error deleting user items:', error);
            }

            // Step 3: Delete user document
            await db.collection('users').doc(this.app.currentUser.uid).delete();
            console.log('Deleted user document');

            // Step 4: Delete auth account
            await this.app.currentUser.delete();
            console.log('Deleted auth account');

            // Step 5: Clear any local data and redirect
            if (this.app.itemsUnsubscribe) this.app.itemsUnsubscribe();
            if (this.app.familyUnsubscribe) this.app.familyUnsubscribe();

            Utils.showToast('Account successfully deleted. Thank you for using FamilyGrocer!');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Error deleting account:', error);
            
            let errorMessage = 'Error deleting account: ' + error.message;
            
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'For security, please log out and log back in before deleting your account.';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please contact support.';
            }
            
            Utils.showToast(errorMessage, 'danger');
        }
    }

    // Advanced WhatsApp sharing to specific phone number
    async shareToSpecificNumber() {
        if (!this.app.currentFamily) {
            Utils.showToast('No family group found');
            return;
        }

        const phoneNumber = prompt('Enter phone number (with country code, e.g., 919876543210):');
        if (!phoneNumber) return;

        // Clean the phone number
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        if (cleanNumber.length < 10) {
            Utils.showToast('Please enter a valid phone number');
            return;
        }

        let familyName = 'Our Family';
        let userName = 'Your Family Member';
        
        try {
            const familyDoc = await db.collection('families').doc(this.app.currentFamily).get();
            if (familyDoc.exists) {
                familyName = familyDoc.data().name || 'Our Family';
            }

            const userDoc = await db.collection('users').doc(this.app.currentUser.uid).get();
            if (userDoc.exists && userDoc.data().name) {
                userName = userDoc.data().name;
            }
        } catch (error) {
            console.log('Could not fetch family or user details');
        }

        const message = `Hi! ${userName} invited you to join *${familyName}* on FamilyGrocer!\n\n` +
                       `Family Code: ${this.app.currentFamily}\n\n` +
                       `Join us for easier family shopping! 🛒`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        Utils.showToast(`Opening WhatsApp for ${phoneNumber}...`);
    }

    // Bulk invite multiple family members
    async bulkInviteFamilyMembers() {
        if (!this.app.currentFamily) {
            Utils.showToast('No family group found');
            return;
        }

        const inviteList = prompt('Enter phone numbers or emails (separated by commas):');
        if (!inviteList) return;

        const contacts = inviteList.split(',').map(contact => contact.trim()).filter(contact => contact);
        
        if (contacts.length === 0) {
            Utils.showToast('No valid contacts provided');
            return;
        }

        const method = prompt(`How to invite ${contacts.length} contacts?\n\n1. WhatsApp\n2. Email\n\nEnter choice (1 or 2):`);

        if (method === '1') {
            // WhatsApp bulk invite
            await this.bulkWhatsAppInvite(contacts);
        } else if (method === '2') {
            // Email bulk invite
            await this.bulkEmailInvite(contacts);
        } else {
            Utils.showToast('Bulk invite cancelled');
        }
    }

    async bulkWhatsAppInvite(contacts) {
        let familyName = 'Our Family';
        try {
            const familyDoc = await db.collection('families').doc(this.app.currentFamily).get();
            if (familyDoc.exists) {
                familyName = familyDoc.data().name || 'Our Family';
            }
        } catch (error) {
            console.log('Could not fetch family name');
        }

        const message = `Join ${familyName} on FamilyGrocer! 🛒\n\nFamily Code: ${this.app.currentFamily}\n\nUse this code to join our family group!`;
        const encodedMessage = encodeURIComponent(message);

        // For multiple contacts, we can only do one at a time
        Utils.showToast(`Preparing invites for ${contacts.length} contacts...`);

        // Open first contact
        const firstContact = contacts[0].replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${firstContact}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');

        // If more contacts, show instructions
        if (contacts.length > 1) {
            setTimeout(() => {
                alert(`Opened WhatsApp for first contact.\n\nFor remaining ${contacts.length - 1} contacts, please:\n1. Copy this message:\n"${message}"\n2. Send it to other contacts manually`);
            }, 1000);
        }
    }

    async bulkEmailInvite(contacts) {
        let familyName = 'Our Family';
        try {
            const familyDoc = await db.collection('families').doc(this.app.currentFamily).get();
            if (familyDoc.exists) {
                familyName = familyDoc.data().name || 'Our Family';
            }
        } catch (error) {
            console.log('Could not fetch family name');
        }

        const subject = `Join ${familyName} on FamilyGrocer!`;
        const body = `You're invited to join ${familyName} on FamilyGrocer!\n\nFamily Code: ${this.app.currentFamily}\n\nUse this code to join our family shopping group.`;

        const emailList = contacts.join(',');
        const mailtoLink = `mailto:${emailList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        
        Utils.showToast('Email client opened with invitation for all contacts');
    }
}

// Initialize the family invite manager when DOM is loaded
let familyInviteManager;
document.addEventListener('DOMContentLoaded', () => {
    // This will be initialized after the main app is created
    setTimeout(() => {
        if (typeof app !== 'undefined') {
            familyInviteManager = new FamilyInviteManager(app);
        }
    }, 1000);
});
