// Authentication functionality
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkFirebaseReady();
        this.setupEventListeners();
        this.checkUrlParams();
        this.checkAuthState();
    }

    async checkFirebaseReady() {
        // Wait for Firebase to be ready
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    setupEventListeners() {
        try {
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
            this.setupEnterKeySupport();
            
        } catch (error) {
            console.error('Error setting up auth event listeners:', error);
        }
    }

    setupEnterKeySupport() {
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
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const mode = urlParams.get('mode');
            
            if (mode === 'signup') {
                this.switchTab('signup');
            } else if (mode === 'login') {
                this.switchTab('login');
            }
        } catch (error) {
            console.error('Error checking URL params:', error);
        }
    }

    checkAuthState() {
        if (!auth) {
            console.error('Auth not initialized');
            return;
        }

        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                // Small delay to ensure everything is loaded
                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 500);
            }
        }, (error) => {
            console.error('Auth state change error:', error);
        });
    }

    switchTab(tab) {
        try {
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            const resetPasswordForm = document.getElementById('resetPasswordForm');
            const loginTab = document.getElementById('loginTab');
            const signupTab = document.getElementById('signupTab');

            if (!loginForm || !signupForm) return;

            // Hide all forms
            loginForm.classList.remove('active');
            signupForm.classList.remove('active');
            if (resetPasswordForm) resetPasswordForm.classList.remove('active');
            
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
        } catch (error) {
            console.error('Error switching tabs:', error);
        }
    }

    showResetPassword() {
        try {
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            const resetPasswordForm = document.getElementById('resetPasswordForm');

            if (loginForm && signupForm && resetPasswordForm) {
                loginForm.classList.remove('active');
                signupForm.classList.remove('active');
                resetPasswordForm.classList.add('active');
            }
        } catch (error) {
            console.error('Error showing reset password:', error);
        }
    }

    showLoginForm() {
        try {
            const resetPasswordForm = document.getElementById('resetPasswordForm');
            const loginForm = document.getElementById('loginForm');

            if (resetPasswordForm && loginForm) {
                resetPasswordForm.classList.remove('active');
                loginForm.classList.add('active');
            }
        } catch (error) {
            console.error('Error showing login form:', error);
        }
    }

    async login() {
        try {
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

            await auth.signInWithEmailAndPassword(email, password);
            Utils.showToast('Login successful!');
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error, 'login');
        }
    }

    async signup() {
        try {
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

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Save user data to Firestore
            await db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                preferences: {
                    notifications: true,
                    budget: 5000
                },
                familyId: null
            });

            Utils.showToast('Account created successfully!');
            
        } catch (error) {
            console.error('Signup error:', error);
            this.handleAuthError(error, 'signup');
        }
    }

    async signInWithGoogle(context) {
        try {
            if (!firebase.auth) {
                Utils.showToast('Google sign-in not available');
                return;
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            Utils.showToast('Signing in with Google...');

            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            if (context === 'signup') {
                // Check if user document already exists
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    await db.collection('users').doc(user.uid).set({
                        name: user.displayName || 'User',
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        photoURL: user.photoURL || null,
                        preferences: {
                            notifications: true,
                            budget: 5000
                        },
                        familyId: null
                    });
                }
            }

            Utils.showToast('Signed in successfully with Google!');
            
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.handleAuthError(error, 'google');
        }
    }

    async resetPassword() {
        try {
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

            await auth.sendPasswordResetEmail(email);
            Utils.showToast('Password reset email sent! Check your inbox.');
            this.showLoginForm();
            
        } catch (error) {
            console.error('Password reset error:', error);
            this.handleAuthError(error, 'reset');
        }
    }

    handleAuthError(error, context) {
        let message = 'Authentication failed';
        
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
            case 'auth/email-already-in-use':
                message = 'Email already in use';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak';
                break;
            case 'auth/popup-closed-by-user':
                message = 'Sign-in cancelled';
                break;
            case 'auth/popup-blocked':
                message = 'Popup blocked by browser. Please allow popups for this site.';
                break;
            default:
                message = error.message || 'Authentication error';
        }
        
        Utils.showToast(message, 'error');
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
