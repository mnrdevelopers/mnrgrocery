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
        this.userPreferences = {};
        
        this.init();
    }

    async init() {
        await this.checkAuthState();
        this.setupEventListeners();
        this.startUsernameAnimationCycle();
    }

    async checkAuthState() {
        this.showScreen('loading');
        
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '1';
            }
        }, 10);
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.checkUserFamily();
            } else {
                setTimeout(() => {
                    if (!this.currentUser) {
                        window.location.href = 'auth.html';
                    }
                }, 5000);
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
            
            await this.ensureUserDocumentExists();
            
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('User data:', userData);
                
                if (userData.familyId) {
                    this.currentFamily = userData.familyId;
                    console.log('User has family:', this.currentFamily);
                    await this.loadFamilyData();
                    this.updateHeaderUsername();
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

        // Expense-related listeners
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    const clearExpenseFilters = document.getElementById('clearExpenseFilters');
    const expenseTypeFilter = document.getElementById('expenseTypeFilter');
    const expenseStatusFilter = document.getElementById('expenseStatusFilter');
    const expenseMonthFilter = document.getElementById('expenseMonthFilter');
    
    if (saveExpenseBtn) saveExpenseBtn.addEventListener('click', () => this.saveExpense());
    if (clearExpenseFilters) clearExpenseFilters.addEventListener('click', () => this.clearExpenseFilters());
    if (expenseTypeFilter) expenseTypeFilter.addEventListener('change', () => this.renderExpensesTable());
    if (expenseStatusFilter) expenseStatusFilter.addEventListener('change', () => this.renderExpensesTable());
    if (expenseMonthFilter) expenseMonthFilter.addEventListener('change', () => this.renderExpensesTable());
    
    // Set default dates for expense form
    this.setExpenseDefaultDates();
}
    setExpenseDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const expenseDueDate = document.getElementById('expenseDueDate');
    const expensePaymentDate = document.getElementById('expensePaymentDate');
    
    // Set due date to end of current month
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0); // Last day of current month
    
    if (expenseDueDate) expenseDueDate.value = endOfMonth.toISOString().split('T')[0];
    if (expensePaymentDate) expensePaymentDate.value = today;
}

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

        // Purchase filter listeners
        const categoryFilter = document.getElementById('purchaseCategoryFilter');
        const storeFilter = document.getElementById('purchaseStoreFilter');
        const monthFilter = document.getElementById('purchaseMonthFilter');
        const clearFilters = document.getElementById('clearPurchaseFilters');
        
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.renderPurchaseTable());
        if (storeFilter) storeFilter.addEventListener('change', () => this.renderPurchaseTable());
        if (monthFilter) monthFilter.addEventListener('change', () => this.renderPurchaseTable());
        if (clearFilters) clearFilters.addEventListener('click', () => this.clearPurchaseFilters());

        // Purchase table action listeners
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn')) {
                const button = e.target.closest('.edit-btn');
                const itemId = button.dataset.id;
                this.editPurchaseItem(itemId);
            }
            
            if (e.target.closest('.delete-btn-purchase')) {
                const button = e.target.closest('.delete-btn-purchase');
                const itemId = button.dataset.id;
                this.deletePurchaseItem(itemId);
            }
        });

        // Actions
        const copyFamilyCodeBtn = document.getElementById('copyFamilyCode');
        const changeNameBtn = document.getElementById('changeNameBtn');
        const setBudgetBtn = document.getElementById('setBudgetBtn');
        const leaveFamilyBtn = document.getElementById('leaveFamilyBtn');
        const exportDataBtn = document.getElementById('exportDataBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const headerLogout = document.getElementById('headerLogout');
        const clearCompleted = document.getElementById('clearCompleted');
        
        if (copyFamilyCodeBtn) copyFamilyCodeBtn.addEventListener('click', () => this.copyFamilyCode());
        if (changeNameBtn) changeNameBtn.addEventListener('click', () => this.changeUserName());
        if (setBudgetBtn) setBudgetBtn.addEventListener('click', () => this.setMonthlyBudget());
        if (leaveFamilyBtn) leaveFamilyBtn.addEventListener('click', () => this.leaveFamily());
        if (exportDataBtn) exportDataBtn.addEventListener('click', () => this.exportShoppingData());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logoutUser());
        if (headerLogout) headerLogout.addEventListener('click', () => this.logoutUser());
        if (clearCompleted) clearCompleted.addEventListener('click', () => this.clearCompletedItems());

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

        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            loadingScreen.style.opacity = '0';
        }
        if (familySetupScreen) familySetupScreen.style.display = 'none';
        if (appScreen) appScreen.style.display = 'none';

        switch(screen) {
            case 'loading':
                if (loadingScreen) {
                    loadingScreen.style.display = 'flex';
                    setTimeout(() => {
                        loadingScreen.style.opacity = '1';
                    }, 10);
                }
                break;
            case 'familySetup':
                if (familySetupScreen) familySetupScreen.style.display = 'flex';
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

    async editPurchaseItem(itemId) {
        const item = this.groceryItems.find(item => item.id === itemId);
        if (!item) {
            Utils.showToast('Item not found');
            return;
        }

        // Create edit form
        const newPrice = prompt('Enter new price (₹):', item.price || '');
        if (newPrice === null) return; // User cancelled
        
        const price = parseFloat(newPrice);
        if (isNaN(price) || price <= 0) {
            Utils.showToast('Please enter a valid price');
            return;
        }

        const newStore = prompt('Enter store name:', item.store || '');
        if (newStore === null) return; // User cancelled
        
        if (!newStore.trim()) {
            Utils.showToast('Please enter a store name');
            return;
        }

        const newDate = prompt('Enter purchase date (YYYY-MM-DD):', item.purchaseDate || '');
        if (newDate === null) return; // User cancelled

        try {
            await db.collection('items').doc(itemId).update({
                price: price,
                store: newStore.trim(),
                purchaseDate: newDate || item.purchaseDate
            });
            
            Utils.showToast('Purchase updated successfully');
        } catch (error) {
            console.error('Error updating purchase:', error);
            Utils.showToast('Error updating purchase: ' + error.message);
        }
    }

    // Delete purchase item (remove price but keep item)
    async deletePurchaseItem(itemId) {
        if (!confirm('Are you sure you want to remove the purchase information for this item? The item will remain in your list but the price will be removed.')) {
            return;
        }

        try {
            await db.collection('items').doc(itemId).update({
                price: null,
                store: null,
                purchaseDate: null,
                completed: false,
                completedBy: null,
                completedAt: null,
                completedByName: null
            });
            
            Utils.showToast('Purchase information removed');
        } catch (error) {
            console.error('Error removing purchase info:', error);
            Utils.showToast('Error removing purchase info: ' + error.message);
        }
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
            
            await db.collection('families').doc(familyCode).set(familyData);
            
            console.log('Updating user document...');
            
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

async saveExpense() {
    const expenseType = document.getElementById('expenseType').value;
    const expenseAmount = parseFloat(document.getElementById('expenseAmount').value);
    const expenseDueDate = document.getElementById('expenseDueDate').value;
    const expensePaymentDate = document.getElementById('expensePaymentDate').value;
    const expenseDescription = document.getElementById('expenseDescription').value.trim();
    const expensePaid = document.getElementById('expensePaid').checked;
    const expenseRecurring = document.getElementById('expenseRecurring').checked;

    if (!expenseType) {
        Utils.showToast('Please select an expense type');
        return;
    }

    if (!expenseAmount || expenseAmount <= 0) {
        Utils.showToast('Please enter a valid amount');
        return;
    }

    if (!expenseDueDate) {
        Utils.showToast('Please select a due date');
        return;
    }

    const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : 'User';

    const expenseData = {
        type: expenseType,
        amount: expenseAmount,
        dueDate: expenseDueDate,
        paymentDate: expensePaid ? expensePaymentDate : null,
        description: expenseDescription,
        paid: expensePaid,
        isRecurring: expenseRecurring,
        addedBy: this.currentUser.uid,
        addedByName: userName,
        familyId: this.currentFamily,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        month: expenseDueDate.substring(0, 7) // YYYY-MM format for filtering
    };

    try {
        await db.collection('expenses').add(expenseData);
        
        // Clear form
        document.getElementById('expenseType').value = '';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseDescription').value = '';
        document.getElementById('expensePaid').checked = false;
        document.getElementById('expenseRecurring').checked = false;
        this.setExpenseDefaultDates();
        
        Utils.showToast('Expense added successfully');
    } catch (error) {
        console.error('Error saving expense:', error);
        Utils.showToast('Error saving expense: ' + error.message);
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
            
            await this.ensureUserDocumentExists();
            
            const familyDoc = await db.collection('families').doc(familyCode).get();
            console.log('Family document exists:', familyDoc.exists);
            
            if (!familyDoc.exists) {
                Utils.showToast('Family not found. Check the code and try again.');
                return;
            }

            const familyData = familyDoc.data();
            console.log('Family data:', familyData);
            
            if (familyData.members && familyData.members.includes(this.currentUser.uid)) {
                Utils.showToast('You are already a member of this family');
                return;
            }

            console.log('Updating family members...');
            
            await db.collection('families').doc(familyCode).update({
                members: firebase.firestore.FieldValue.arrayUnion(this.currentUser.uid)
            });

            console.log('Updating user document...');
            
            await db.collection('users').doc(this.currentUser.uid).update({
                familyId: familyCode
            });

            this.currentFamily = familyCode;
            this.showScreen('app');
            await this.loadFamilyData();
            Utils.showToast('Joined family successfully!');
            
            if (familyCodeInput) familyCodeInput.value = '';
            
        } catch (error) {
            console.error('Error joining family:', error);
            Utils.showToast('Error joining family: ' + error.message);
        }
    }

    async loadFamilyData() {
        if (!this.currentFamily) {
            console.error('No current family set');
            return;
        }

        if (this.itemsUnsubscribe) {
            this.itemsUnsubscribe();
            this.itemsUnsubscribe = null;
        }
        if (this.familyUnsubscribe) {
            this.familyUnsubscribe();
            this.familyUnsubscribe = null;
        }

        try {
            this.itemsUnsubscribe = db.collection('items')
                .where('familyId', '==', this.currentFamily)
                .onSnapshot((snapshot) => {
                    console.log('Items snapshot received:', snapshot.size, 'items');
                    
                    this.groceryItems = [];
                    snapshot.forEach((doc) => {
                        const itemData = doc.data();
                        this.groceryItems.push({
                            id: doc.id,
                            ...itemData
                        });
                    });

                    this.groceryItems.sort((a, b) => {
                        const dateA = a.createdAt?.toDate() || new Date(0);
                        const dateB = b.createdAt?.toDate() || new Date(0);
                        return dateB - dateA;
                    });

                    console.log('Processed items:', this.groceryItems.length);
                    this.renderItems();
                    this.updateStats();
                    this.updatePurchaseItemsList();
                    this.renderPurchaseTable();
                    this.updateFamilyStats();
                    
                }, (error) => {
                    console.error('Error listening to items:', error);
                    Utils.showToast('Error loading items: ' + error.message);
                });

            this.familyUnsubscribe = db.collection('families').doc(this.currentFamily)
                .onSnapshot(async (doc) => {
                    if (doc.exists) {
                        const familyData = doc.data();
                        console.log('Family data loaded:', familyData);
                        await this.loadFamilyMembers(familyData.members || []);
                        const familyCodeDisplay = document.getElementById('familyCodeDisplay');
                        if (familyCodeDisplay) familyCodeDisplay.textContent = this.currentFamily;
                    } else {
                        console.error('Family document not found');
                        Utils.showToast('Family not found');
                    }
                }, (error) => {
                    console.error('Error listening to family:', error);
                    Utils.showToast('Error loading family data: ' + error.message);
                });

        } catch (error) {
            console.error('Error setting up listeners:', error);
            Utils.showToast('Error setting up data listeners');
        }
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
            const today = new Date().toISOString().split('T')[0];
            purchaseDate.value = today;
        }
    }

    // Render purchase table
    renderPurchaseTable() {
        const tableBody = document.getElementById('purchases-table-body');
        const emptyState = document.getElementById('purchases-empty');
        const filteredCount = document.getElementById('filtered-count');
        const filteredTotal = document.getElementById('filtered-total');
        
        if (!tableBody || !emptyState) return;

        // Update grid templates for header and rows
        const tableHeader = tableBody.previousElementSibling;
        if (tableHeader && tableHeader.classList.contains('table-header')) {
            tableHeader.style.gridTemplateColumns = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr';
        }

        const purchasedItems = this.groceryItems.filter(item => item.price && item.price > 0);
        
        const categoryFilter = document.getElementById('purchaseCategoryFilter')?.value || 'all';
        const storeFilter = document.getElementById('purchaseStoreFilter')?.value || 'all';
        const monthFilter = document.getElementById('purchaseMonthFilter')?.value || '';
        
        let filteredPurchases = purchasedItems.filter(item => {
            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
            const matchesStore = storeFilter === 'all' || item.store === storeFilter;
            const matchesMonth = !monthFilter || (item.purchaseDate && item.purchaseDate.startsWith(monthFilter));
            
            return matchesCategory && matchesStore && matchesMonth;
        });

        filteredPurchases.sort((a, b) => {
            const dateA = a.purchaseDate ? new Date(a.purchaseDate) : new Date(0);
            const dateB = b.purchaseDate ? new Date(b.purchaseDate) : new Date(0);
            return dateB - dateA;
        });

        tableBody.innerHTML = '';
        
        if (filteredPurchases.length > 0) {
            emptyState.style.display = 'none';
            tableBody.style.display = 'block';
            
            filteredPurchases.forEach(item => {
                const row = document.createElement('div');
                row.className = 'purchase-table-row';
                row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr';
                
                row.innerHTML = this.createPurchaseTableRowHTML(item);
                tableBody.appendChild(row);
            });
        } else {
            emptyState.style.display = 'block';
            tableBody.style.display = 'none';
        }

        const totalAmount = filteredPurchases.reduce((sum, item) => sum + (item.price || 0), 0);
        
        if (filteredCount) filteredCount.textContent = filteredPurchases.length;
        if (filteredTotal) filteredTotal.textContent = `₹${totalAmount.toFixed(2)}`;
    }

    // Create purchase table row
    createPurchaseTableRowHTML(item) {
        const categoryLabels = {
            'fruits': '🍎 Fruits',
            'dairy': '🥛 Dairy',
            'meat': '🍗 Meat',
            'bakery': '🍞 Bakery',
            'beverages': '🥤 Drinks',
            'snacks': '🍿 Snacks',
            'household': '🏠 Household',
            'personal': '🧴 Personal',
            'frozen': '🧊 Frozen',
            'grains': '🌾 Grains',
            'other': '📦 Other',
            'uncategorized': '📦 General'
        };

        const formattedDate = Utils.formatDate(item.purchaseDate);
        const addedByName = item.addedByName || 'User';
        const isAddedByCurrentUser = item.addedBy === this.currentUser.uid;

        return `
            <div class="purchase-table-cell item-name-cell" data-label="Item">
                <span>${item.name}</span>
            </div>
            <div class="purchase-table-cell category-cell" data-label="Category">
                <span class="category-badge">${categoryLabels[item.category] || item.category}</span>
            </div>
            <div class="purchase-table-cell quantity-cell" data-label="Quantity">
                ${item.quantity} ${item.unit}
            </div>
            <div class="purchase-table-cell price-cell" data-label="Price">
                ₹${item.price?.toFixed(2) || '0.00'}
            </div>
            <div class="purchase-table-cell store-cell" data-label="Store">
                ${item.store || '-'}
            </div>
            <div class="purchase-table-cell date-cell" data-label="Date">
                ${formattedDate}
            </div>
            <div class="purchase-table-cell added-by-cell" data-label="Added By">
                <div class="added-by-avatar">${addedByName.charAt(0).toUpperCase()}</div>
                <span>${addedByName}</span>
            </div>
            <div class="purchase-table-cell actions-cell" data-label="Actions">
                ${isAddedByCurrentUser ? `
                    <button class="table-action-btn edit-btn" data-id="${item.id}">
                        <span>✏️</span> Edit
                    </button>
                    <button class="table-action-btn delete-btn-purchase" data-id="${item.id}">
                        <span>🗑️</span> Delete
                    </button>
                ` : `
                    <span class="text-secondary">-</span>
                `}
            </div>
        `;
    }

    // Clear purchase filters
    clearPurchaseFilters() {
        const categoryFilter = document.getElementById('purchaseCategoryFilter');
        const storeFilter = document.getElementById('purchaseStoreFilter');
        const monthFilter = document.getElementById('purchaseMonthFilter');
        
        if (categoryFilter) categoryFilter.value = 'all';
        if (storeFilter) storeFilter.value = 'all';
        if (monthFilter) monthFilter.value = '';
        
        this.renderPurchaseTable();
    }

    // Update purchase filters
    updatePurchaseFilters() {
        const storeFilter = document.getElementById('purchaseStoreFilter');
        if (!storeFilter) return;

        const purchasedItems = this.groceryItems.filter(item => item.price && item.price > 0);
        const stores = [...new Set(purchasedItems.map(item => item.store).filter(store => store))];
        
        storeFilter.innerHTML = '<option value="all">All Stores</option>';
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store;
            option.textContent = store;
            storeFilter.appendChild(option);
        });
    }

    renderItems() {
        const pendingItemsContainer = document.getElementById('pending-items');
        
        if (!pendingItemsContainer) {
            console.error('Required DOM elements not found');
            return;
        }

        let filteredItems = this.groceryItems.filter(item => {
            const matchesCategory = this.currentFilter === 'all' || 
                                  (this.currentFilter === 'urgent' ? item.isUrgent : 
                                  (this.currentFilter === 'claimed' ? item.claimedBy : 
                                  (this.currentFilter === 'recurring' ? item.isRecurring : item.category === this.currentFilter)));
            const matchesSearch = item.name.toLowerCase().includes(this.currentSearch.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        const pendingItems = filteredItems.filter(item => !item.completed);

        console.log('Rendering items:', { total: this.groceryItems.length, pending: pendingItems.length });

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

        const pendingBadge = document.getElementById('pending-badge');
        if (pendingBadge) pendingBadge.textContent = `(${pendingItems.length})`;

        this.addItemEventListeners();
    }

    focusItemInput() {
        const itemInput = document.getElementById('itemInput');
        if (itemInput) itemInput.focus();
    }

    addItemEventListeners() {
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.grocery-item');
                if (itemElement) {
                    const id = itemElement.dataset.id;
                    this.toggleItem(id);
                }
            });
        });

        document.querySelectorAll('.claim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.grocery-item');
                if (itemElement) {
                    const id = itemElement.dataset.id;
                    this.claimItem(id);
                }
            });
        });

        document.querySelectorAll('.unclaim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.grocery-item');
                if (itemElement) {
                    const id = itemElement.dataset.id;
                    this.unclaimItem(id);
                }
            });
        });

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
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(tab => {
            tab.classList.toggle('active', tab.id === `${tabName}Tab`);
        });

        if (tabName === 'purchases') {
            this.updatePurchaseItemsList();
            this.renderPurchaseTable();
            this.updatePurchaseFilters();
        } else if (tabName === 'family') {
            this.loadFamilyTab();
        } else if (tabName === 'settings') {
            this.loadSettingsTab();
        }
    }

 if (tabName === 'expenses') {
        this.renderExpensesTable();
        this.updateExpensesSummary();
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
        this.updateHeaderUsername();
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

                if (userData.preferences) {
                    this.userPreferences = userData.preferences;
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async updateHeaderUsername() {
        const headerUsername = document.getElementById('headerUsername');
        if (headerUsername && this.currentUser) {
            try {
                const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const userName = userData.name || 'User';
                    
                    headerUsername.className = 'username';
                    headerUsername.classList.add('color-cycle');
                    headerUsername.textContent = userName;
                    
                    headerUsername.style.transition = 'all 0.3s ease';
                    headerUsername.addEventListener('mouseenter', () => {
                        headerUsername.style.transform = 'scale(1.1)';
                    });
                    headerUsername.addEventListener('mouseleave', () => {
                        headerUsername.style.transform = 'scale(1)';
                    });
                }
            } catch (error) {
                console.error('Error updating header username:', error);
            }
        }
    }

    startUsernameAnimationCycle() {
        const headerUsername = document.getElementById('headerUsername');
        if (!headerUsername) return;
        
        const animations = ['pulse', 'bounce', 'glow'];
        let currentAnimation = 0;
        
        setInterval(() => {
            headerUsername.className = 'username';
            headerUsername.classList.add(animations[currentAnimation]);
            currentAnimation = (currentAnimation + 1) % animations.length;
        }, 10000);
    }

    updateStats() {
        const total = this.groceryItems.length;
        const completed = this.groceryItems.filter(item => item.completed).length;
        const claimed = this.groceryItems.filter(item => item.claimedBy && !item.completed).length;
        const pending = total - completed;

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

    updateFamilyStats() {
        const topShopperSpan = document.getElementById('topShopper');
        const familyTotalItemsSpan = document.getElementById('familyTotalItems');
        const familyPurchasedItemsSpan = document.getElementById('familyPurchasedItems');
        const familyUrgentItemsSpan = document.getElementById('familyUrgentItems');

        if (!topShopperSpan || !familyTotalItemsSpan || !familyPurchasedItemsSpan || !familyUrgentItemsSpan) return;

        const completedItems = this.groceryItems.filter(item => item.completed);
        const purchasedItems = this.groceryItems.filter(item => item.price && item.price > 0);
        const urgentItems = this.groceryItems.filter(item => item.isUrgent);

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

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GroceryApp();
});

renderExpensesTable() {
    const tableBody = document.getElementById('expenses-table-body');
    const emptyState = document.getElementById('expenses-empty');
    
    if (!tableBody || !emptyState) return;

    // This would need to be connected to your Firestore expenses collection
    // For now, I'll show the structure - you'll need to implement the data loading
    const expenses = []; // This should come from your Firestore
    
    const typeFilter = document.getElementById('expenseTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('expenseStatusFilter')?.value || 'all';
    const monthFilter = document.getElementById('expenseMonthFilter')?.value || '';
    
    let filteredExpenses = expenses.filter(expense => {
        const matchesType = typeFilter === 'all' || expense.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'paid' ? expense.paid : !expense.paid);
        const matchesMonth = !monthFilter || expense.month === monthFilter;
        
        return matchesType && matchesStatus && matchesMonth;
    });

    tableBody.innerHTML = '';
    
    if (filteredExpenses.length > 0) {
        emptyState.style.display = 'none';
        tableBody.style.display = 'block';
        
        filteredExpenses.forEach(expense => {
            const row = document.createElement('div');
            row.className = 'purchase-table-row';
            row.innerHTML = this.createExpenseTableRowHTML(expense);
            tableBody.appendChild(row);
        });
    } else {
        emptyState.style.display = 'block';
        tableBody.style.display = 'none';
    }

    this.updateExpensesSummary(filteredExpenses);
}

createExpenseTableRowHTML(expense) {
    const typeLabels = {
        'electricity': '⚡ Electricity',
        'water': '💧 Water',
        'internet': '🌐 Internet',
        'gas': '🔥 Gas',
        'rent': '🏠 Rent',
        'maintenance': '🔧 Maintenance',
        'insurance': '🛡️ Insurance',
        'other': '📦 Other'
    };

    const formattedDueDate = Utils.formatDate(expense.dueDate);
    const formattedPaymentDate = expense.paymentDate ? Utils.formatDate(expense.paymentDate) : '-';
    const isAddedByCurrentUser = expense.addedBy === this.currentUser.uid;

    return `
        <div class="purchase-table-cell" data-label="Type">
            <span class="expense-type-badge expense-type-${expense.type}">
                ${typeLabels[expense.type] || expense.type}
            </span>
        </div>
        <div class="purchase-table-cell" data-label="Description">
            ${expense.description || '-'}
        </div>
        <div class="purchase-table-cell price-cell" data-label="Amount">
            ₹${expense.amount?.toFixed(2) || '0.00'}
        </div>
        <div class="purchase-table-cell date-cell" data-label="Due Date">
            ${formattedDueDate}
        </div>
        <div class="purchase-table-cell date-cell" data-label="Payment Date">
            ${formattedPaymentDate}
        </div>
        <div class="purchase-table-cell" data-label="Status">
            <span class="expense-status-badge expense-status-${expense.paid ? 'paid' : 'pending'}">
                ${expense.paid ? '✅ Paid' : '⏳ Pending'}
            </span>
        </div>
        <div class="purchase-table-cell added-by-cell" data-label="Added By">
            <div class="added-by-avatar">${expense.addedByName ? expense.addedByName.charAt(0).toUpperCase() : 'U'}</div>
            <span>${expense.addedByName}</span>
        </div>
        <div class="purchase-table-cell actions-cell" data-label="Actions">
            ${isAddedByCurrentUser ? `
                <button class="table-action-btn edit-btn" onclick="app.editExpense('${expense.id}')">
                    <span>✏️</span> Edit
                </button>
                <button class="table-action-btn delete-btn-purchase" onclick="app.deleteExpense('${expense.id}')">
                    <span>🗑️</span> Delete
                </button>
            ` : `
                <span class="text-secondary">-</span>
            `}
        </div>
    `;
}

updateExpensesSummary(expenses = []) {
    const monthlyTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paidTotal = expenses.filter(e => e.paid).reduce((sum, expense) => sum + expense.amount, 0);
    const pendingTotal = monthlyTotal - paidTotal;

    const monthlyExpensesTotal = document.getElementById('monthly-expenses-total');
    const monthlyExpensesPaid = document.getElementById('monthly-expenses-paid');
    const monthlyExpensesPending = document.getElementById('monthly-expenses-pending');
    const budgetStatus = document.getElementById('budget-status');
    const filteredExpensesCount = document.getElementById('filtered-expenses-count');
    const filteredExpensesTotal = document.getElementById('filtered-expenses-total');

    if (monthlyExpensesTotal) monthlyExpensesTotal.textContent = `₹${monthlyTotal.toFixed(0)}`;
    if (monthlyExpensesPaid) monthlyExpensesPaid.textContent = `₹${paidTotal.toFixed(0)}`;
    if (monthlyExpensesPending) monthlyExpensesPending.textContent = `₹${pendingTotal.toFixed(0)}`;
    if (filteredExpensesCount) filteredExpensesCount.textContent = expenses.length;
    if (filteredExpensesTotal) filteredExpensesTotal.textContent = `₹${monthlyTotal.toFixed(2)}`;

    // Budget status logic
    if (budgetStatus && this.userPreferences.budget) {
        const groceryTotal = this.calculateMonthlyGroceryTotal();
        const totalSpending = monthlyTotal + groceryTotal;
        const budgetPercentage = (totalSpending / this.userPreferences.budget) * 100;

        if (budgetPercentage < 70) {
            budgetStatus.textContent = 'On Track';
            budgetStatus.className = 'summary-value budget-on-track';
        } else if (budgetPercentage < 90) {
            budgetStatus.textContent = 'Warning';
            budgetStatus.className = 'summary-value budget-warning';
        } else {
            budgetStatus.textContent = 'Over Budget';
            budgetStatus.className = 'summary-value budget-over';
        }
    }
}

calculateMonthlyGroceryTotal() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyPurchases = this.groceryItems.filter(item => {
        if (!item.purchaseDate) return false;
        const purchaseDate = new Date(item.purchaseDate);
        return purchaseDate.getMonth() === currentMonth && 
               purchaseDate.getFullYear() === currentYear;
    });

    return monthlyPurchases.reduce((sum, item) => sum + (item.price || 0), 0);
}

clearExpenseFilters() {
    const typeFilter = document.getElementById('expenseTypeFilter');
    const statusFilter = document.getElementById('expenseStatusFilter');
    const monthFilter = document.getElementById('expenseMonthFilter');
    
    if (typeFilter) typeFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    if (monthFilter) monthFilter.value = '';
    
    this.renderExpensesTable();
}

async editExpense(expenseId) {
    // Implement expense editing logic
    Utils.showToast('Edit expense functionality coming soon!');
}

async deleteExpense(expenseId) {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            await db.collection('expenses').doc(expenseId).delete();
            Utils.showToast('Expense deleted successfully');
        } catch (error) {
            console.error('Error deleting expense:', error);
            Utils.showToast('Error deleting expense: ' + error.message);
        }
    }
}
