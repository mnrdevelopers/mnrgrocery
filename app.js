// Main Application JavaScript
class GroceryApp {
    constructor() {
        this.currentUser = null;
        this.currentFamily = null;
        this.groceryItems = [];
        this.familyMembers = [];
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.itemsUnsubscribe = null;
        this.familyUnsubscribe = null;
        this.userBudget = 5000;
        
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        this.bindEvents();
        this.loadUserData();
    }

    async checkAuthentication() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    await this.checkUserFamily();
                    this.hideLoading();
                    resolve();
                } else {
                    // Redirect to auth page if not authenticated
                    window.location.href = 'auth.html';
                }
            });
        });
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Sidebar
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('closeSidebar').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarLogout').addEventListener('click', () => this.logout());
        document.getElementById('userMenuBtn').addEventListener('click', () => this.toggleSidebar());

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuBtn = document.getElementById('menuBtn');
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !menuBtn.contains(e.target)) {
                this.toggleSidebar();
            }
        });
    }

    hideLoading() {
        document.getElementById('appLoading').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('active');
    }

    switchTab(tabName) {
        // Update active states
        document.querySelectorAll('.nav-item, .nav-btn').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(item => {
            item.classList.add('active');
        });

        // Show selected tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');

        // Load tab-specific content
        this.loadTabContent(tabName);
    }

    loadTabContent(tabName) {
        switch (tabName) {
            case 'list':
                this.loadListTab();
                break;
            case 'analytics':
                this.loadAnalyticsTab();
                break;
            case 'family':
                this.loadFamilyTab();
                break;
            case 'settings':
                this.loadSettingsTab();
                break;
        }
    }

    async checkUserFamily() {
        try {
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            
            if (userDoc.exists && userDoc.data().familyId) {
                this.currentFamily = userDoc.data().familyId;
                this.loadFamilyData();
            } else {
                // Redirect to family setup (you can create a family-setup.html)
                this.showFamilySetupModal();
            }
        } catch (error) {
            console.error('Error checking user family:', error);
            utils.showToast('Error loading family data', 'error');
        }
    }

    loadFamilyData() {
        // Load grocery items
        if (this.itemsUnsubscribe) this.itemsUnsubscribe();
        
        this.itemsUnsubscribe = db.collection('items')
            .where('familyId', '==', this.currentFamily)
            .onSnapshot((snapshot) => {
                this.groceryItems = [];
                snapshot.forEach((doc) => {
                    this.groceryItems.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.renderGroceryList();
                this.updateStats();
            });

        // Load family members
        if (this.familyUnsubscribe) this.familyUnsubscribe();
        
        this.familyUnsubscribe = db.collection('families').doc(this.currentFamily)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    this.loadFamilyMembers(doc.data().members);
                }
            });
    }

    // ... (rest of your existing grocery app functionality)

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            if (this.itemsUnsubscribe) this.itemsUnsubscribe();
            if (this.familyUnsubscribe) this.familyUnsubscribe();
            
            try {
                await auth.signOut();
                localStorage.removeItem('userToken');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                
                window.location.href = 'auth.html';
            } catch (error) {
                utils.showToast('Error logging out', 'error');
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GroceryApp();
});
