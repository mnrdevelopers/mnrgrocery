// Main application functionality
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
        this.completedVisible = false;
        this.userPreferences = {};
        
        this.init();
    }

    async init() {
        await this.checkAuthState();
        this.setupEventListeners();
    }

    async checkAuthState() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.checkUserFamily();
            } else {
                window.location.href = 'auth.html';
            }
        });
    }

  async checkUserFamily() {
    if (!this.currentUser) {
        window.location.href = 'auth.html';
        return;
    }

    try {
        await this.debugUserStatus();
        console.log('Checking user family for:', this.currentUser.uid);
        
        // Ensure user document exists
        await this.ensureUserDocumentExists();
        
        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('User data:', userData);
            
            if (userData.familyId) {
                this.currentFamily = userData.familyId;
                console.log('User has family:', this.currentFamily);
                await this.loadFamilyData();
                this.showScreen('app');
            } else {
                console.log('User needs family setup');
                this.showScreen('familySetup');
            }
        } else {
            console.log('User document not found, creating one...');
            await this.createUserDocument();
            this.showScreen('familySetup');
        }
        
        this.hideLoadingScreen();
    } catch (error) {
        console.error("Error checking user family:", error);
        Utils.showToast('Error loading user data: ' + error.message);
        this.showScreen('familySetup');
        this.hideLoadingScreen();
    }
}

async ensureUserDocumentExists() {
    const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
    
    if (!userDoc.exists) {
        console.log('Creating missing user document for:', this.currentUser.uid);
        await this.createUserDocument();
    }
}

async createUserDocument() {
    const userData = {
        name: this.currentUser.displayName || 'User',
        email: this.currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        photoURL: this.currentUser.photoURL || null,
        preferences: {
            notifications: true,
            budget: 5000
        },
        familyId: null
    };

    await db.collection('users').doc(this.currentUser.uid).set(userData);
    console.log('User document created successfully');
}

    setupEventListeners() {
        // Family setup
        const createFamilyBtn = document.getElementById('createFamilyBtn');
        const joinFamilyBtn = document.getElementById('joinFamilyBtn');
        const logoutFromSetup = document.getElementById('logoutFromSetup');
        
        if (createFamilyBtn) createFamilyBtn.addEventListener('click', () => this.createFamily());
        if (joinFamilyBtn) joinFamilyBtn.addEventListener('click', () => this.joinFamily());
        if (logoutFromSetup) logoutFromSetup.addEventListener('click', () => this.logoutUser());

        // Main app
        const addItemBtn = document.getElementById('addItemBtn');
        const itemInput = document.getElementById('itemInput');
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        if (addItemBtn) addItemBtn.addEventListener('click', () => this.addItem());
        if (itemInput) {
            itemInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addItem();
            });
        }
        if (searchInput) searchInput.addEventListener('input', (e) => this.handleSearch(e));
        if (clearSearch) clearSearch.addEventListener('click', () => this.clearSearchInput());

        // Categories
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.category;
                this.renderItems();
            });
        });

        // Navigation tabs
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Purchase-related
        const savePriceBtn = document.getElementById('savePriceBtn');
        const purchaseItemSelect = document.getElementById('purchaseItemSelect');
        const addPriceBtn = document.getElementById('addPriceBtn');
        
        if (savePriceBtn) savePriceBtn.addEventListener('click', () => this.savePurchasePrice());
        if (purchaseItemSelect) purchaseItemSelect.addEventListener('change', () => this.updatePurchaseForm());
        if (addPriceBtn) addPriceBtn.addEventListener('click', () => this.switchTab('purchases'));

        // Actions
        const copyFamilyCodeBtn = document.getElementById('copyFamilyCode');
        const changeNameBtn = document.getElementById('changeNameBtn');
        const setBudgetBtn = document.getElementById('setBudgetBtn');
        const leaveFamilyBtn = document.getElementById('leaveFamilyBtn');
        const exportDataBtn = document.getElementById('exportDataBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const headerLogout = document.getElementById('headerLogout');
        const clearCompleted = document.getElementById('clearCompleted');
        const toggleCompleted = document.getElementById('toggleCompleted');
        
        if (copyFamilyCodeBtn) copyFamilyCodeBtn.addEventListener('click', () => this.copyFamilyCode());
        if (changeNameBtn) changeNameBtn.addEventListener('click', () => this.changeUserName());
        if (setBudgetBtn) setBudgetBtn.addEventListener('click', () => this.setMonthlyBudget());
        if (leaveFamilyBtn) leaveFamilyBtn.addEventListener('click', () => this.leaveFamily());
        if (exportDataBtn) exportDataBtn.addEventListener('click', () => this.exportShoppingData());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logoutUser());
        if (headerLogout) headerLogout.addEventListener('click', () => this.logoutUser());
        if (clearCompleted) clearCompleted.addEventListener('click', () => this.clearCompletedItems());
        if (toggleCompleted) toggleCompleted.addEventListener('click', () => this.toggleCompletedVisibility());

        // Set default dates
        this.setDefaultDates();
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('dateInput');
        const purchaseDate = document.getElementById('purchaseDate');
        
        if (dateInput) dateInput.value = today;
        if (purchaseDate) purchaseDate.value = today;
    }

    showScreen(screen) {
        const loadingScreen = document.getElementById('loadingScreen');
        const familySetupScreen = document.getElementById('familySetupScreen');
        const appScreen = document.getElementById('appScreen');

        // Hide all screens first
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (familySetupScreen) familySetupScreen.style.display = 'none';
        if (appScreen) appScreen.style.display = 'none';

        // Show the requested screen
        switch(screen) {
            case 'familySetup':
                if (familySetupScreen) familySetupScreen.style.display = 'block';
                break;
            case 'app':
                if (appScreen) appScreen.style.display = 'block';
                this.loadUserPreferences();
                break;
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    // Add to setupEventListeners() in app.js
const notificationSettingsBtn = document.getElementById('notificationSettingsBtn');
if (notificationSettingsBtn) {
    notificationSettingsBtn.addEventListener('click', () => this.showNotificationSettings());
}

// Add new method to GroceryApp class
showNotificationSettings() {
    if (!notificationManager) return;
    
    const settings = notificationManager.getSettings();
    
    // Update switch states
    document.getElementById('enableNotifications').checked = settings.notifications;
    document.getElementById('enableSound').checked = settings.sound;
    document.getElementById('notifyItemAdded').checked = settings.itemAdded;
    document.getElementById('notifyItemCompleted').checked = settings.itemCompleted;
    document.getElementById('notifyPriceAdded').checked = settings.priceAdded;
    document.getElementById('notifyFamilyActivity').checked = settings.familyActivity;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('notificationSettingsModal'));
    modal.show();
    
    // Add event listeners for the modal
    this.setupNotificationModalEvents();
}

setupNotificationModalEvents() {
    const testBtn = document.getElementById('testNotificationBtn');
    const saveBtn = document.getElementById('saveNotificationSettings');
    
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            if (notificationManager) {
                notificationManager.testNotification();
            }
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            this.saveNotificationSettings();
        });
    }
}

saveNotificationSettings() {
    if (!notificationManager) return;
    
    const newSettings = {
        notifications: document.getElementById('enableNotifications').checked,
        sound: document.getElementById('enableSound').checked,
        itemAdded: document.getElementById('notifyItemAdded').checked,
        itemCompleted: document.getElementById('notifyItemCompleted').checked,
        priceAdded: document.getElementById('notifyPriceAdded').checked,
        familyActivity: document.getElementById('notifyFamilyActivity').checked
    };
    
    notificationManager.updateSettings(newSettings);
    Utils.showToast('Notification settings saved!');
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('notificationSettingsModal'));
    modal.hide();
}

async createFamily() {
    const familyCode = Utils.generateFamilyCode();
    
    console.log('Creating family with code:', familyCode);

    let userName = 'User';
    try {
        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        if (userDoc.exists && userDoc.data().name) {
            userName = userDoc.data().name;
        }
    } catch (error) {
        console.error('Error getting user name:', error);
    }

    const familyData = {
        name: `${userName}'s Family`,
        createdBy: this.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        members: [this.currentUser.uid],
        code: familyCode
    };

    Utils.showToast('Creating family...');

    try {
        console.log('Creating family document...');
        
        // Create family document
        await db.collection('families').doc(familyCode).set(familyData);
        
        console.log('Updating user document...');
        
        // Update user's familyId
        await db.collection('users').doc(this.currentUser.uid).update({
            familyId: familyCode
        });

        this.currentFamily = familyCode;
        this.showScreen('app');
        await this.loadFamilyData();
        Utils.showToast(`Family created! Code: ${familyCode}`);
    } catch (error) {
        console.error('Error creating family:', error);
        console.error('Error code:', error.code);
        
        let errorMessage = 'Error creating family: ' + error.message;
        
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check Firestore rules.';
        }
        
        Utils.showToast(errorMessage);
    }
}

 async joinFamily() {
    const familyCodeInput = document.getElementById('familyCodeInput');
    const familyCode = familyCodeInput ? familyCodeInput.value.toUpperCase().trim() : '';
    
    if (!familyCode) {
        Utils.showToast('Please enter a family code');
        return;
    }

    if (familyCode.length !== 6) {
        Utils.showToast('Family code must be 6 characters');
        return;
    }

    Utils.showToast('Joining family...');

    try {
        console.log('Attempting to join family:', familyCode);
        
        // Ensure user document exists
        await this.ensureUserDocumentExists();
        
        // First, check if family exists
        const familyDoc = await db.collection('families').doc(familyCode).get();
        console.log('Family document exists:', familyDoc.exists);
        
        if (!familyDoc.exists) {
            Utils.showToast('Family not found. Check the code and try again.');
            return;
        }

        const familyData = familyDoc.data();
        console.log('Family data:', familyData);
        
        // Check if user is already a member
        if (familyData.members && familyData.members.includes(this.currentUser.uid)) {
            Utils.showToast('You are already a member of this family');
            return;
        }

        console.log('Updating family members...');
        
        // Update family members array
        await db.collection('families').doc(familyCode).update({
            members: firebase.firestore.FieldValue.arrayUnion(this.currentUser.uid)
        });

        console.log('Updating user document...');
        
        // Update user's familyId
        await db.collection('users').doc(this.currentUser.uid).update({
            familyId: familyCode
        });

        this.currentFamily = familyCode;
        this.showScreen('app');
        await this.loadFamilyData();
        Utils.showToast('Joined family successfully!');
        
        // Clear input field
        if (familyCodeInput) familyCodeInput.value = '';
        
    } catch (error) {
        console.error('Error joining family:', error);
        Utils.showToast('Error joining family: ' + error.message);
    }
}

    async loadFamilyData() {
        if (!this.currentFamily) return;

        // Unsubscribe from previous listeners
        if (this.itemsUnsubscribe) this.itemsUnsubscribe();
        if (this.familyUnsubscribe) this.familyUnsubscribe();

        // Set up real-time listener for grocery items
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

                // Sort items by creation date (newest first)
                this.groceryItems.sort((a, b) => {
                    const dateA = a.createdAt?.toDate() || new Date(0);
                    const dateB = b.createdAt?.toDate() || new Date(0);
                    return dateB - dateA;
                });

                this.renderItems();
                this.updateStats();
                this.updatePurchaseItemsList();
                this.updateRecentPurchases();
                this.updateFamilyStats();
            }, (error) => {
                console.error('Error listening to items:', error);
                Utils.showToast('Error loading items');
            });

        // Set up real-time listener for family members
        this.familyUnsubscribe = db.collection('families').doc(this.currentFamily)
            .onSnapshot(async (doc) => {
                if (doc.exists) {
                    const familyData = doc.data();
                    await this.loadFamilyMembers(familyData.members);
                    const familyCodeDisplay = document.getElementById('familyCodeDisplay');
                    if (familyCodeDisplay) familyCodeDisplay.textContent = this.currentFamily;
                }
            }, (error) => {
                console.error('Error listening to family:', error);
                Utils.showToast('Error loading family data');
            });
    }

    async loadFamilyMembers(memberIds) {
        if (!memberIds || !Array.isArray(memberIds)) return;
        
        this.familyMembers = [];
        const familyMembersContainer = document.getElementById('familyMembers');
        if (familyMembersContainer) familyMembersContainer.innerHTML = '';

        for (const memberId of memberIds) {
            try {
                const memberDoc = await db.collection('users').doc(memberId).get();
                if (memberDoc.exists) {
                    const member = {
                        id: memberId,
                        ...memberDoc.data()
                    };
                    this.familyMembers.push(member);
                    
                    if (familyMembersContainer) {
                        const avatar = document.createElement('div');
                        avatar.className = 'member-avatar';
                        avatar.textContent = member.name ? member.name.charAt(0).toUpperCase() : '?';
                        avatar.title = member.name || 'Unknown User';
                        familyMembersContainer.appendChild(avatar);
                    }
                }
            } catch (error) {
                console.error('Error loading member:', error);
            }
        }
    }

    async addItem() {
        const itemInput = document.getElementById('itemInput');
        const qtyInput = document.getElementById('qtyInput');
        const unitSelect = document.getElementById('unitSelect');
        const categorySelect = document.getElementById('categorySelect');
        const urgentCheckbox = document.getElementById('urgentCheckbox');
        const repeatCheckbox = document.getElementById('repeatCheckbox');
        
        const name = itemInput ? itemInput.value.trim() : '';
        const quantity = parseFloat(qtyInput ? qtyInput.value : 1) || 1;
        const unit = unitSelect ? unitSelect.value : 'pcs';
        const category = categorySelect ? categorySelect.value : 'uncategorized';
        const isUrgent = urgentCheckbox ? urgentCheckbox.checked : false;
        const isRecurring = repeatCheckbox ? repeatCheckbox.checked : false;
        
        if (name === '') {
            Utils.showToast('Please enter an item name');
            return;
        }

        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : 'User';

        const itemData = {
            name,
            quantity,
            unit,
            category,
            isUrgent,
            isRecurring,
            completed: false,
            addedBy: this.currentUser.uid,
            addedByName: userName,
            familyId: this.currentFamily,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            price: null,
            purchaseDate: null,
            store: null,
            claimedBy: null,
            claimedByName: null,
            claimedAt: null
        };

        try {
            await db.collection('items').add(itemData);

             // Show notification to other family members
        if (notificationManager) {
            notificationManager.showItemAddedNotification(name, userName);
        }
        
        // Reset form and show success
        if (itemInput) itemInput.value = '';
            
            // Reset form
            if (itemInput) itemInput.value = '';
            if (qtyInput) qtyInput.value = '1';
            if (unitSelect) unitSelect.value = 'pcs';
            if (categorySelect) categorySelect.value = 'uncategorized';
            if (urgentCheckbox) urgentCheckbox.checked = false;
            if (repeatCheckbox) repeatCheckbox.checked = false;
            if (itemInput) itemInput.focus();
            
            Utils.showToast('Item added to list successfully');
        } catch (error) {
            console.error('Error adding item:', error);
            Utils.showToast('Error adding item: ' + error.message);
        }
    }

   async toggleItem(id) {
    const item = this.groceryItems.find(item => item.id === id);
    if (item) {
        const newCompletedState = !item.completed;
        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : 'User';

        try {
            await db.collection('items').doc(id).update({
                completed: newCompletedState,
                completedBy: newCompletedState ? this.currentUser.uid : null,
                completedAt: newCompletedState ? firebase.firestore.FieldValue.serverTimestamp() : null,
                completedByName: newCompletedState ? userName : null
            });

            // Show notification
            if (newCompletedState && notificationManager) {
                notificationManager.showItemCompletedNotification(item.name, userName);
            }
        } catch (error) {
            console.error('Error updating item:', error);
            Utils.showToast('Error updating item: ' + error.message);
        }
    }
}

  async claimItem(id) {
    const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : 'User';

    try {
        await db.collection('items').doc(id).update({
            claimedBy: this.currentUser.uid,
            claimedByName: userName,
            claimedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Show family activity notification
        if (notificationManager) {
            const item = this.groceryItems.find(item => item.id === id);
            notificationManager.showFamilyActivityNotification(userName, `claimed "${item.name}"`);
        }

        Utils.showToast('Item claimed');
    } catch (error) {
        console.error('Error claiming item:', error);
        Utils.showToast('Error claiming item: ' + error.message);
    }
}

    async unclaimItem(id) {
        try {
            await db.collection('items').doc(id).update({
                claimedBy: null,
                claimedByName: null,
                claimedAt: null
            });
            Utils.showToast('Item unclaimed');
        } catch (error) {
            console.error('Error unclaiming item:', error);
            Utils.showToast('Error unclaiming item: ' + error.message);
        }
    }

    async deleteItem(id) {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                await db.collection('items').doc(id).delete();
                Utils.showToast('Item deleted');
            } catch (error) {
                console.error('Error deleting item:', error);
                Utils.showToast('Error deleting item: ' + error.message);
            }
        }
    }

    async savePurchasePrice() {
        const purchaseItemSelect = document.getElementById('purchaseItemSelect');
        const purchasePrice = document.getElementById('purchasePrice');
        const purchaseStore = document.getElementById('purchaseStore');
        const purchaseDate = document.getElementById('purchaseDate');
        
        const itemId = purchaseItemSelect ? purchaseItemSelect.value : '';
        const price = parseFloat(purchasePrice ? purchasePrice.value : 0);
        const store = purchaseStore ? purchaseStore.value.trim() : '';
        const date = purchaseDate ? purchaseDate.value : '';

        if (!itemId) {
            Utils.showToast('Please select an item');
            return;
        }

        if (!price || price <= 0) {
            Utils.showToast('Please enter a valid price');
            return;
        }

        if (!store) {
            Utils.showToast('Please enter store name');
            return;
        }

        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : 'User';

        try {
            await db.collection('items').doc(itemId).update({
                price: price,
                store: store,
                purchaseDate: date,
                completed: true,
                completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                completedBy: this.currentUser.uid,
                completedByName: userName
            });

            // Show notification
        if (notificationManager) {
            notificationManager.showPriceAddedNotification(item.name, price);
        }

            // Reset purchase form
            if (purchasePrice) purchasePrice.value = '';
            if (purchaseStore) purchaseStore.value = '';
            if (purchaseItemSelect) purchaseItemSelect.value = '';

            Utils.showToast('Purchase price saved successfully');
            this.updatePurchaseItemsList();
        } catch (error) {
            console.error('Error saving price:', error);
            Utils.showToast('Error saving price: ' + error.message);
        }
    }

    updatePurchaseItemsList() {
        const purchaseItemSelect = document.getElementById('purchaseItemSelect');
        if (!purchaseItemSelect) return;

        // Get items that are completed but don't have prices yet
        const unpricedItems = this.groceryItems.filter(item => 
            item.completed && (!item.price || item.price === 0)
        );

        purchaseItemSelect.innerHTML = '<option value="">-- Select purchased item --</option>';

        unpricedItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.quantity} ${item.unit})`;
            purchaseItemSelect.appendChild(option);
        });

        // Show/hide add price button based on unpriced items
        const addPriceBtn = document.getElementById('addPriceBtn');
        if (addPriceBtn) {
            addPriceBtn.style.display = unpricedItems.length > 0 ? 'inline-block' : 'none';
        }
    }

    updatePurchaseForm() {
        const purchaseItemSelect = document.getElementById('purchaseItemSelect');
        const purchaseDate = document.getElementById('purchaseDate');
        
        const itemId = purchaseItemSelect.value;
        const item = this.groceryItems.find(item => item.id === itemId);

        if (item && purchaseDate) {
            // Set purchase date to today if not already set
            const today = new Date().toISOString().split('T')[0];
            purchaseDate.value = today;
        }
    }

    renderItems() {
        const pendingItemsContainer = document.getElementById('pending-items');
        const completedItemsContainer = document.getElementById('completed-items');
        if (!pendingItemsContainer || !completedItemsContainer) return;

        let filteredItems = this.groceryItems.filter(item => {
            const matchesCategory = this.currentFilter === 'all' || 
                                  (this.currentFilter === 'urgent' ? item.isUrgent : 
                                  (this.currentFilter === 'claimed' ? item.claimedBy : 
                                  (this.currentFilter === 'recurring' ? item.isRecurring : item.category === this.currentFilter)));
            const matchesSearch = item.name.toLowerCase().includes(this.currentSearch);
            return matchesCategory && matchesSearch;
        });

        const pendingItems = filteredItems.filter(item => !item.completed);
        const completedItems = filteredItems.filter(item => item.completed);

        // Render pending items
        if (pendingItems.length > 0) {
            pendingItemsContainer.innerHTML = pendingItems.map(item => this.createItemHTML(item)).join('');
        } else {
            pendingItemsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <p>No items to buy</p>
                    <button class="outline" onclick="app.focusItemInput()">Add Your First Item</button>
                </div>
            `;
        }

        // Render completed items
        if (completedItems.length > 0) {
            completedItemsContainer.innerHTML = completedItems.map(item => this.createItemHTML(item)).join('');
        } else {
            completedItemsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p>No purchased items yet</p>
                </div>
            `;
        }

        // Add event listeners
        this.addItemEventListeners();
    }

    focusItemInput() {
        const itemInput = document.getElementById('itemInput');
        if (itemInput) itemInput.focus();
    }

    addItemEventListeners() {
        // Checkbox event listeners
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.grocery-item');
                if (itemElement) {
                    const id = itemElement.dataset.id;
                    this.toggleItem(id);
                }
            });
        });

        // Claim button event listeners
        document.querySelectorAll('.claim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.grocery-item');
                if (itemElement) {
                    const id = itemElement.dataset.id;
                    this.claimItem(id);
                }
            });
        });

        // Unclaim button event listeners
        document.querySelectorAll('.unclaim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.grocery-item');
                if (itemElement) {
                    const id = itemElement.dataset.id;
                    this.unclaimItem(id);
                }
            });
        });

        // Delete button event listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.grocery-item');
                if (itemElement) {
                    const id = itemElement.dataset.id;
                    this.deleteItem(id);
                }
            });
        });
    }

    createItemHTML(item) {
        const categoryLabels = {
            'uncategorized': 'Uncategorized',
            'fruits': 'Fruits & Veg',
            'dairy': 'Dairy',
            'meat': 'Meat & Fish',
            'bakery': 'Bakery',
            'beverages': 'Beverages',
            'snacks': 'Snacks',
            'household': 'Household',
            'personal': 'Personal Care',
            'frozen': 'Frozen Foods',
            'grains': 'Grains',
            'other': 'Other'
        };

        const formattedDate = Utils.formatDate(item.purchaseDate);
        const isUrgent = item.isUrgent && !item.completed;
        const isClaimed = item.claimedBy && !item.completed;
        const isAddedByCurrentUser = item.addedBy === this.currentUser.uid;
        const isClaimedByCurrentUser = item.claimedBy === this.currentUser.uid;
        const hasPrice = item.price && item.price > 0;

        return `
            <div class="grocery-item ${item.completed ? 'checked' : ''} ${isUrgent ? 'urgent' : ''} ${isClaimed ? 'claimed' : ''}" data-id="${item.id}">
                <div class="checkbox item-checkbox ${item.completed ? 'checked' : ''}">
                    ${item.completed ? '✓' : ''}
                </div>
                <div class="item-details">
                    <div class="item-name">
                        ${item.name} 
                        ${isUrgent ? '<span class="urgent-badge">URGENT</span>' : ''}
                        ${isClaimed ? '<span class="claimed-badge">CLAIMED</span>' : ''}
                        ${item.isRecurring ? '<span class="claimed-badge" style="background: var(--accent);">🔁</span>' : ''}
                        ${hasPrice ? `<span class="item-price-added">₹${item.price}</span>` : ''}
                    </div>
                    <div class="item-meta">
                        <span class="item-category">${categoryLabels[item.category] || item.category}</span>
                        <span class="item-qty">${item.quantity} ${item.unit}</span>
                        ${hasPrice ? `<span class="item-store">${item.store || ''} • ${formattedDate}</span>` : ''}
                        <span class="item-added-by">
                            <div class="user-avatar">${item.addedByName ? item.addedByName.charAt(0).toUpperCase() : 'U'}</div>
                            Added by ${item.addedByName || 'User'}
                        </span>
                    </div>
                </div>
                <div class="item-actions">
                    ${!item.completed ? (
                        isClaimed ? (
                            isClaimedByCurrentUser ? 
                            '<button class="action-btn outline unclaim-btn">Unclaim</button>' :
                            '<button class="action-btn outline" disabled>Claimed</button>'
                        ) : (
                            '<button class="action-btn secondary claim-btn">I\'ll Buy</button>'
                        )
                    ) : ''}
                    ${isAddedByCurrentUser || isClaimedByCurrentUser ? 
                        '<button class="action-btn danger delete-btn">Delete</button>' : ''}
                </div>
            </div>
        `;
    }

    handleSearch(e) {
        this.currentSearch = e.target.value.toLowerCase();
        this.renderItems();
    }

    clearSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            this.currentSearch = '';
            this.renderItems();
        }
    }

    switchTab(tabName) {
        // Update nav buttons
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tab => {
            tab.classList.toggle('active', tab.id === `${tabName}Tab`);
        });

        // Load tab-specific data
        if (tabName === 'purchases') {
            this.updatePurchaseItemsList();
            this.updateRecentPurchases();
        } else if (tabName === 'family') {
            this.loadFamilyTab();
        } else if (tabName === 'settings') {
            this.loadSettingsTab();
        }
    }

    loadFamilyTab() {
        const familyMembersList = document.getElementById('familyMembersList');
        if (!familyMembersList) return;

        familyMembersList.innerHTML = '';

        if (this.familyMembers.length === 0) {
            familyMembersList.innerHTML = '<p>Loading family members...</p>';
            return;
        }

        this.familyMembers.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'user-info';
            memberElement.innerHTML = `
                <div class="user-avatar-large">${member.name ? member.name.charAt(0).toUpperCase() : 'U'}</div>
                <div class="user-details">
                    <h3>${member.name || 'User'}</h3>
                    <p>${member.email || 'No email'}</p>
                </div>
            `;
            familyMembersList.appendChild(memberElement);
        });
    }

    async loadSettingsTab() {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userAvatarLarge = document.getElementById('userAvatarLarge');

        if (!userNameDisplay || !userEmailDisplay || !userAvatarLarge) return;

        try {
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userNameDisplay.textContent = userData.name || 'User';
                userEmailDisplay.textContent = this.currentUser.email;
                userAvatarLarge.textContent = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';

                // Load preferences
                if (userData.preferences) {
                    this.userPreferences = userData.preferences;
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateStats() {
        const total = this.groceryItems.length;
        const completed = this.groceryItems.filter(item => item.completed).length;
        const claimed = this.groceryItems.filter(item => item.claimedBy && !item.completed).length;
        const pending = total - completed;

        // Monthly stats
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyItems = this.groceryItems.filter(item => {
            if (!item.completedAt) return false;
            const completedDate = item.completedAt.toDate();
            return completedDate.getMonth() === currentMonth && 
                   completedDate.getFullYear() === currentYear;
        });

        const purchasedItems = this.groceryItems.filter(item => item.price && item.price > 0);
        const monthlyPurchases = purchasedItems.filter(item => {
            if (!item.purchaseDate) return false;
            const purchaseDate = new Date(item.purchaseDate);
            return purchaseDate.getMonth() === currentMonth && 
                   purchaseDate.getFullYear() === currentYear;
        });

        const monthlyTotal = monthlyPurchases.reduce((sum, item) => sum + (item.price || 0), 0);
        const monthlyAverage = monthlyPurchases.length > 0 ? monthlyTotal / monthlyPurchases.length : 0;

        // Update UI
        const totalItemsSpan = document.getElementById('total-items');
        const completedItemsSpan = document.getElementById('completed-items');
        const monthlyItemsSpan = document.getElementById('monthly-items');
        const claimedCountSpan = document.getElementById('claimed-count');
        const pendingCountSpan = document.getElementById('pending-count');
        const completedCountSpan = document.getElementById('completed-count');
        const monthlyPurchasesSpan = document.getElementById('monthly-purchases');
        const monthlyTotalSpan = document.getElementById('monthly-total');
        const monthlyAverageSpan = document.getElementById('monthly-average');

        if (totalItemsSpan) totalItemsSpan.textContent = total;
        if (completedItemsSpan) completedItemsSpan.textContent = completed;
        if (monthlyItemsSpan) monthlyItemsSpan.textContent = monthlyItems.length;
        if (claimedCountSpan) claimedCountSpan.textContent = claimed;
        if (pendingCountSpan) pendingCountSpan.textContent = pending;
        if (completedCountSpan) completedCountSpan.textContent = completed;
        if (monthlyPurchasesSpan) monthlyPurchasesSpan.textContent = monthlyPurchases.length;
        if (monthlyTotalSpan) monthlyTotalSpan.textContent = `₹${monthlyTotal.toFixed(0)}`;
        if (monthlyAverageSpan) monthlyAverageSpan.textContent = `₹${monthlyAverage.toFixed(0)}`;
    }

    updateRecentPurchases() {
        const recentPurchasesList = document.getElementById('recent-purchases-list');
        if (!recentPurchasesList) return;

        const purchasedItems = this.groceryItems
            .filter(item => item.price && item.price > 0)
            .sort((a, b) => {
                const dateA = a.purchaseDate ? new Date(a.purchaseDate) : new Date(0);
                const dateB = b.purchaseDate ? new Date(b.purchaseDate) : new Date(0);
                return dateB - dateA;
            })
            .slice(0, 10);

        if (purchasedItems.length === 0) {
            recentPurchasesList.innerHTML = '<p class="empty-state">No purchases yet</p>';
            return;
        }

        recentPurchasesList.innerHTML = purchasedItems.map(item => `
            <div class="purchase-record">
                <div class="purchase-info">
                    <div class="purchase-item-name">${item.name}</div>
                    <div class="purchase-details">${item.quantity} ${item.unit} • ${item.store || 'Unknown store'} • ${Utils.formatDate(item.purchaseDate)}</div>
                </div>
                <div class="purchase-price">₹${item.price.toFixed(2)}</div>
            </div>
        `).join('');
    }

    updateFamilyStats() {
        const topShopperSpan = document.getElementById('topShopper');
        const familyTotalItemsSpan = document.getElementById('familyTotalItems');
        const familyPurchasedItemsSpan = document.getElementById('familyPurchasedItems');
        const familyUrgentItemsSpan = document.getElementById('familyUrgentItems');

        if (!topShopperSpan || !familyTotalItemsSpan || !familyPurchasedItemsSpan || !familyUrgentItemsSpan) return;

        const completedItems = this.groceryItems.filter(item => item.completed);
        const purchasedItems = this.groceryItems.filter(item => item.price && item.price > 0);
        const urgentItems = this.groceryItems.filter(item => item.isUrgent);

        // Simple implementation for top shopper
        const shopperCounts = {};
        completedItems.forEach(item => {
            if (item.completedByName) {
                shopperCounts[item.completedByName] = (shopperCounts[item.completedByName] || 0) + 1;
            }
        });

        let topShopper = 'None';
        let maxCount = 0;
        Object.entries(shopperCounts).forEach(([shopper, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topShopper = shopper;
            }
        });

        topShopperSpan.textContent = topShopper;
        familyTotalItemsSpan.textContent = this.groceryItems.length;
        familyPurchasedItemsSpan.textContent = purchasedItems.length;
        familyUrgentItemsSpan.textContent = urgentItems.length;
    }

    async loadUserPreferences() {
        if (!this.currentUser) return;

        try {
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists && userDoc.data().preferences) {
                this.userPreferences = userDoc.data().preferences;
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }

    async setMonthlyBudget() {
        const newBudget = prompt('Enter your monthly budget (₹):', this.userPreferences.budget || 5000);
        if (newBudget && !isNaN(newBudget) && newBudget > 0) {
            this.userPreferences.budget = parseInt(newBudget);

            try {
                await db.collection('users').doc(this.currentUser.uid).update({
                    preferences: this.userPreferences
                });
                Utils.showToast(`Monthly budget set to ₹${this.userPreferences.budget}`);
            } catch (error) {
                console.error('Error updating budget:', error);
                Utils.showToast('Error updating budget');
            }
        }
    }

    async changeUserName() {
        const userNameDisplay = document.getElementById('userNameDisplay');
        const currentName = userNameDisplay ? userNameDisplay.textContent : 'User';
        
        const newName = prompt('Enter your display name:', currentName);
        if (newName && newName.trim() !== '') {
            try {
                await db.collection('users').doc(this.currentUser.uid).update({
                    name: newName.trim()
                });
                Utils.showToast('Name updated successfully!');
                this.loadSettingsTab();
            } catch (error) {
                Utils.showToast('Error updating name: ' + error.message);
            }
        }
    }

    async leaveFamily() {
        if (confirm('Are you sure you want to leave this family group? You will need a family code to rejoin.')) {
            try {
                await db.collection('families').doc(this.currentFamily).update({
                    members: firebase.firestore.FieldValue.arrayRemove(this.currentUser.uid)
                });

                await db.collection('users').doc(this.currentUser.uid).update({
                    familyId: null
                });

                this.currentFamily = null;
                this.showScreen('familySetup');
                Utils.showToast('You have left the family group');
            } catch (error) {
                Utils.showToast('Error leaving family: ' + error.message);
            }
        }
    }

    exportShoppingData() {
        const data = {
            exportedAt: new Date().toISOString(),
            familyCode: this.currentFamily,
            items: this.groceryItems,
            preferences: this.userPreferences
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `familygrocer-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        Utils.showToast('Data exported successfully!');
    }

    async copyFamilyCode() {
        if (!this.currentFamily) return;

        try {
            await Utils.copyToClipboard(this.currentFamily);
            Utils.showToast('Family code copied to clipboard!');
        } catch (error) {
            Utils.showToast('Error copying family code');
        }
    }

    async clearCompletedItems() {
        const completedItems = this.groceryItems.filter(item => item.completed);
        if (completedItems.length === 0) {
            Utils.showToast('No completed items to clear');
            return;
        }

        if (confirm(`Are you sure you want to delete ${completedItems.length} completed items?`)) {
            const batch = db.batch();
            completedItems.forEach(item => {
                const ref = db.collection('items').doc(item.id);
                batch.delete(ref);
            });

            try {
                await batch.commit();
                Utils.showToast(`${completedItems.length} items cleared`);
            } catch (error) {
                console.error('Error clearing items:', error);
                Utils.showToast('Error clearing items');
            }
        }
    }

    toggleCompletedVisibility() {
        this.completedVisible = !this.completedVisible;
        const completedItemsContainer = document.getElementById('completed-items');
        const toggleCompleted = document.getElementById('toggleCompleted');
        
        if (completedItemsContainer) {
            completedItemsContainer.style.display = this.completedVisible ? 'block' : 'none';
        }
        if (toggleCompleted) {
            toggleCompleted.textContent = this.completedVisible ? 'Hide' : 'Show';
        }
    }

    async debugUserStatus() {
    console.log('=== DEBUG USER STATUS ===');
    console.log('Current User UID:', this.currentUser?.uid);
    console.log('Current User Email:', this.currentUser?.email);
    console.log('Current User Display Name:', this.currentUser?.displayName);
    
    try {
        const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
        console.log('User Document Exists:', userDoc.exists);
        if (userDoc.exists) {
            console.log('User Document Data:', userDoc.data());
        }
        
        // Check if user exists in any family
        const families = await db.collection('families').get();
        console.log('Total families:', families.size);
        
        families.forEach(doc => {
            const family = doc.data();
            if (family.members && family.members.includes(this.currentUser.uid)) {
                console.log('User found in family:', doc.id);
            }
        });
        
    } catch (error) {
        console.error('Debug error:', error);
    }
    console.log('=== END DEBUG ===');
}


    async logoutUser() {
        if (confirm('Are you sure you want to logout?')) {
            // Unsubscribe from listeners
            if (this.itemsUnsubscribe) this.itemsUnsubscribe();
            if (this.familyUnsubscribe) this.familyUnsubscribe();

            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                Utils.showToast('Error logging out: ' + error.message);
            }
        }
    }
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GroceryApp();
});
