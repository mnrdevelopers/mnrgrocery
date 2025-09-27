// Authentication functionality
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkUrlParams();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Tab switching
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');
        
        if (loginTab) loginTab.addEventListener('click', () => this.switchTab('login'));
        if (signupTab) signupTab.addEventListener('click', () => this.switchTab('signup'));
        
        // Form submissions
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const googleSignupBtn = document.getElementById('googleSignupBtn');
        const forgotPassword = document.getElementById('forgotPassword');
        const resetPasswordBtn = document.getElementById('resetPasswordBtn');
        const backToLogin = document.getElementById('backToLogin');
        
        if (loginBtn) loginBtn.addEventListener('click', () => this.login());
        if (signupBtn) signupBtn.addEventListener('click', () => this.signup());
        if (googleLoginBtn) googleLoginBtn.addEventListener('click', () => this.signInWithGoogle('login'));
        if (googleSignupBtn) googleSignupBtn.addEventListener('click', () => this.signInWithGoogle('signup'));
        if (forgotPassword) forgotPassword.addEventListener('click', () => this.showResetPassword());
        if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', () => this.resetPassword());
        if (backToLogin) backToLogin.addEventListener('click', () => this.showLoginForm());

        // Enter key support
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const signupName = document.getElementById('signupName');
        const signupEmail = document.getElementById('signupEmail');
        const signupPassword = document.getElementById('signupPassword');
        const resetEmail = document.getElementById('resetEmail');

        [loginEmail, loginPassword].forEach(input => {
            if (input) input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.login();
            });
        });

        [signupName, signupEmail, signupPassword].forEach(input => {
            if (input) input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.signup();
            });
        });

        if (resetEmail) {
            resetEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.resetPassword();
            });
        }
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        if (mode === 'signup') {
            this.switchTab('signup');
        } else if (mode === 'login') {
            this.switchTab('login');
        }
    }

    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                // Redirect to app if user is already authenticated
                window.location.href = 'app.html';
            }
        });
    }

    switchTab(tab) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');

        if (!loginForm || !signupForm || !resetPasswordForm) return;

        // Hide all forms
        loginForm.classList.remove('active');
        signupForm.classList.remove('active');
        resetPasswordForm.classList.remove('active');
        
        // Update tabs
        if (loginTab && signupTab) {
            loginTab.classList.remove('active');
            signupTab.classList.remove('active');
        }

        if (tab === 'login') {
            if (loginTab) loginTab.classList.add('active');
            if (loginForm) loginForm.classList.add('active');
        } else if (tab === 'signup') {
            if (signupTab) signupTab.classList.add('active');
            if (signupForm) signupForm.classList.add('active');
        }
    }

    showResetPassword() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const resetPasswordForm = document.getElementById('resetPasswordForm');

        if (loginForm && signupForm && resetPasswordForm) {
            loginForm.classList.remove('active');
            signupForm.classList.remove('active');
            resetPasswordForm.classList.add('active');
        }
    }

    showLoginForm() {
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        const loginForm = document.getElementById('loginForm');

        if (resetPasswordForm && loginForm) {
            resetPasswordForm.classList.remove('active');
            loginForm.classList.add('active');
        }
    }

    async login() {
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value.trim();
        
        if (!email || !password) {
            Utils.showToast('Please enter email and password');
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Please enter a valid email address');
            return;
        }

        Utils.showToast('Signing in...');

        try {
            await auth.signInWithEmailAndPassword(email, password);
            Utils.showToast('Login successful!');
            // Redirect will happen automatically due to auth state change
        } catch (error) {
            console.error('Login error:', error);
            let message = 'Login failed';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address';
                    break;
                default:
                    message = error.message;
            }
            
            Utils.showToast(message);
        }
    }

   async signup() {
    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value.trim();
    
    if (!name || !email || !password) {
        Utils.showToast('Please fill all fields');
        return;
    }

    if (!Utils.validateEmail(email)) {
        Utils.showToast('Please enter a valid email address');
        return;
    }

    if (!Utils.validatePassword(password)) {
        Utils.showToast('Password must be at least 6 characters');
        return;
    }

    Utils.showToast('Creating account...');

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Save user data to Firestore with familyId
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            preferences: {
                notifications: true,
                budget: 5000
            },
            familyId: null  // Important: Initialize as null
        });

        Utils.showToast('Account created successfully! Redirecting to family setup...');
        
        // Redirect to app for family setup
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 1500);
        
    } catch (error) {
        console.error('Signup error:', error);
        Utils.showToast('Sign up failed: ' + error.message);
    }
}
    
  async signInWithGoogle(context) {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    Utils.showToast('Signing in with Google...');

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        // Check if user document already exists
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create user document for new Google sign-ups
            await db.collection('users').doc(user.uid).set({
                name: user.displayName || 'User',
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                photoURL: user.photoURL || null,
                preferences: {
                    notifications: true,
                    budget: 5000
                },
                // Important: Initialize with null familyId
                familyId: null
            });
            console.log('New Google user document created');
        } else {
            console.log('Existing Google user document found');
        }

        Utils.showToast('Signed in successfully with Google!');
        
        // Redirect to appropriate screen based on family status
        const updatedUserDoc = await db.collection('users').doc(user.uid).get();
        if (updatedUserDoc.exists && updatedUserDoc.data().familyId) {
            // User has a family, redirect to app
            window.location.href = 'app.html';
        } else {
            // User needs to join/create family
            window.location.href = 'app.html'; // Will handle family setup in app.html
        }
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        Utils.showToast('Google sign-in failed: ' + error.message);
    }
}

    async resetPassword() {
        const email = document.getElementById('resetEmail')?.value.trim();
        
        if (!email) {
            Utils.showToast('Please enter your email address');
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Please enter a valid email address');
            return;
        }

        Utils.showToast('Sending reset email...');

        try {
            await auth.sendPasswordResetEmail(email);
            Utils.showToast('Password reset email sent! Check your inbox.');
            this.showLoginForm();
        } catch (error) {
            console.error('Password reset error:', error);
            let message = 'Error sending reset email';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email';
                    break;
                default:
                    message = error.message;
            }
            
            Utils.showToast(message);
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
