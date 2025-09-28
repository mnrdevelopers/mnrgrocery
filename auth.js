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
        this.loadRememberedCredentials();
    }

    async checkFirebaseReady() {
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
            
            // Password visibility toggles
            const loginPasswordToggle = document.getElementById('loginPasswordToggle');
            const signupPasswordToggle = document.getElementById('signupPasswordToggle');
            
            if (loginPasswordToggle) loginPasswordToggle.addEventListener('click', () => this.togglePasswordVisibility('loginPassword'));
            if (signupPasswordToggle) signupPasswordToggle.addEventListener('click', () => this.togglePasswordVisibility('signupPassword'));
            
            // Password strength check
            const signupPassword = document.getElementById('signupPassword');
            if (signupPassword) signupPassword.addEventListener('input', () => this.checkPasswordStrength());
            
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

    togglePasswordVisibility(fieldId) {
        const passwordField = document.getElementById(fieldId);
        const toggleButton = document.getElementById(fieldId + 'Toggle');
        
        if (passwordField && toggleButton) {
            const isPassword = passwordField.type === 'password';
            passwordField.type = isPassword ? 'text' : 'password';
            toggleButton.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            toggleButton.classList.toggle('active', isPassword);
        }
    }

    checkPasswordStrength() {
        const passwordField = document.getElementById('signupPassword');
        const strengthBar = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        const strengthContainer = document.getElementById('passwordStrength');
        
        if (!passwordField || !strengthBar || !strengthText) return;
        
        const password = passwordField.value;
        strengthContainer.classList.add('visible');
        
        let strength = 0;
        let text = 'Weak';
        let className = 'weak';
        
        if (password.length >= 6) strength += 25;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 10;
        
        if (strength >= 65) {
            text = 'Strong';
            className = 'strong';
        } else if (strength >= 35) {
            text = 'Medium';
            className = 'medium';
        }
        
        strengthBar.className = 'strength-fill ' + className;
        strengthText.textContent = text + ' password';
    }

    loadRememberedCredentials() {
        try {
            const rememberedEmail = localStorage.getItem('rememberedEmail');
            const rememberMe = document.getElementById('rememberMe');
            
            if (rememberedEmail && rememberMe) {
                const emailField = document.getElementById('loginEmail');
                if (emailField) {
                    emailField.value = rememberedEmail;
                    rememberMe.checked = true;
                }
            }
        } catch (error) {
            console.error('Error loading remembered credentials:', error);
        }
    }

    saveRememberedCredentials(email) {
        try {
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
        } catch (error) {
            console.error('Error saving remembered credentials:', error);
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
                
                // Reset password strength meter
                this.checkPasswordStrength();
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

   setButtonLoading(button, isLoading) {
    if (button) {
        const btnText = button.querySelector('.btn-text');
        const btnIcon = button.querySelector('.btn-icon');
        
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            
            // Hide text and icon smoothly
            if (btnText) btnText.style.opacity = '0';
            if (btnIcon) btnIcon.style.opacity = '0';
            
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            
            // Show text and icon smoothly
            if (btnText) {
                btnText.style.opacity = '1';
                btnText.style.transform = 'translateY(0)';
            }
            if (btnIcon) {
                btnIcon.style.opacity = '1';
                btnIcon.style.transform = 'scale(1)';
            }
        }
    }
}
    
    async login() {
        try {
            const email = document.getElementById('loginEmail')?.value.trim();
            const password = document.getElementById('loginPassword')?.value.trim();
            const loginBtn = document.getElementById('loginBtn');
            
            if (!email || !password) {
                Utils.showToast('Please enter email and password');
                return;
            }

            if (!Utils.validateEmail(email)) {
                Utils.showToast('Please enter a valid email address');
                return;
            }

            this.setButtonLoading(loginBtn, true);
            Utils.showToast('Signing in...');

            await auth.signInWithEmailAndPassword(email, password);
            
            // Save remember me preference
            this.saveRememberedCredentials(email);
            
            Utils.showToast('Login successful!');
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error, 'login');
        } finally {
            this.setButtonLoading(document.getElementById('loginBtn'), false);
        }
    }

    async signup() {
        try {
            const name = document.getElementById('signupName')?.value.trim();
            const email = document.getElementById('signupEmail')?.value.trim();
            const password = document.getElementById('signupPassword')?.value.trim();
            const signupBtn = document.getElementById('signupBtn');
            
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

            this.setButtonLoading(signupBtn, true);
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
        } finally {
            this.setButtonLoading(document.getElementById('signupBtn'), false);
        }
    }

    async signInWithGoogle(context) {
        try {
            if (!firebase.auth) {
                Utils.showToast('Google sign-in not available');
                return;
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            const googleBtn = context === 'login' ? document.getElementById('googleLoginBtn') : document.getElementById('googleSignupBtn');
            
            this.setButtonLoading(googleBtn, true);
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
        } finally {
            const googleBtn = context === 'login' ? document.getElementById('googleLoginBtn') : document.getElementById('googleSignupBtn');
            this.setButtonLoading(googleBtn, false);
        }
    }

    async resetPassword() {
        try {
            const email = document.getElementById('resetEmail')?.value.trim();
            const resetBtn = document.getElementById('resetPasswordBtn');
            
            if (!email) {
                Utils.showToast('Please enter your email address');
                return;
            }

            if (!Utils.validateEmail(email)) {
                Utils.showToast('Please enter a valid email address');
                return;
            }

            this.setButtonLoading(resetBtn, true);
            Utils.showToast('Sending reset email...');

            await auth.sendPasswordResetEmail(email);
            Utils.showToast('Password reset email sent! Check your inbox.');
            this.showLoginForm();
            
        } catch (error) {
            console.error('Password reset error:', error);
            this.handleAuthError(error, 'reset');
        } finally {
            this.setButtonLoading(document.getElementById('resetPasswordBtn'), false);
        }
    }

    // Helper method to check if email exists (for better UX)
async checkEmailExists(email) {
    try {
        // This is a workaround since Firebase doesn't provide a direct way to check email existence
        // without trying to sign in. We'll use this for better UX messages.
        const methods = await auth.fetchSignInMethodsForEmail(email);
        return methods.length > 0;
    } catch (error) {
        console.log('Error checking email existence:', error);
        return false;
    }
}

// Enhanced login method with better email checking
async login() {
    try {
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value.trim();
        const loginBtn = document.getElementById('loginBtn');
        
        // Enhanced validation
        if (!email || !password) {
            Utils.showToast('Please enter both email and password', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (password.length < 6) {
            Utils.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        this.setButtonLoading(loginBtn, true);
        Utils.showToast('Signing you in...', 'info');

        // Optional: Check if email exists first for better UX
        try {
            const emailExists = await this.checkEmailExists(email);
            if (!emailExists) {
                Utils.showToast('No account found with this email. Please sign up first.', 'error');
                this.setButtonLoading(loginBtn, false);
                
                // Auto-switch to signup after a delay
                setTimeout(() => {
                    this.switchTab('signup');
                    const signupEmail = document.getElementById('signupEmail');
                    if (signupEmail) signupEmail.value = email;
                }, 2000);
                return;
            }
        } catch (emailCheckError) {
            // Continue with normal login if email check fails
            console.log('Email check failed, continuing with login');
        }

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Save remember me preference
        this.saveRememberedCredentials(email);
        
        Utils.showToast('Welcome back! Login successful!', 'success');
        
    } catch (error) {
        console.error('Login error:', error);
        this.handleAuthError(error, 'login');
    } finally {
        this.setButtonLoading(document.getElementById('loginBtn'), false);
    }
}

  handleAuthError(error, context) {
    let message = 'Something went wrong. Please try again.';
    let toastType = 'error';
    
    switch (error.code) {
        // Email/Password Login Errors
        case 'auth/invalid-login-credentials':
        case 'auth/invalid-credential': // Some versions use this
            if (context === 'login') {
                message = 'Invalid email or password. Please check your credentials.';
                // Don't specify whether it's email or password for security
            } else {
                message = 'Authentication failed. Please try again.';
            }
            break;
        case 'auth/user-not-found':
            message = 'No account found with this email address. Please sign up first.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
        case 'auth/invalid-email':
            message = 'Please enter a valid email address.';
            break;
            
        // Signup Errors
        case 'auth/email-already-in-use':
            message = 'This email is already registered. Please try logging in instead.';
            toastType = 'info';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak. Please use at least 6 characters.';
            break;
            
        // Google Auth Errors
        case 'auth/popup-closed-by-user':
            message = 'Sign-in was cancelled. Please try again.';
            toastType = 'info';
            break;
        case 'auth/popup-blocked':
            message = 'Popup was blocked by your browser. Please allow popups for this site.';
            break;
        case 'auth/cancelled-popup-request':
            message = 'Sign-in process was cancelled.';
            toastType = 'info';
            break;
            
        // Network Errors
        case 'auth/network-request-failed':
            message = 'Network error. Please check your internet connection.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
            
        // Account Related
        case 'auth/user-disabled':
            message = 'This account has been disabled. Please contact support.';
            break;
        case 'auth/requires-recent-login':
            message = 'Please log out and log back in to continue.';
            break;
            
        // Password Reset
        case 'auth/missing-email':
            message = 'Please enter your email address.';
            break;
            
        default:
            // For unknown errors, show a generic message
            console.error('Auth error:', error.code, error.message);
            message = 'Authentication failed. Please try again.';
    }
    
    // Show user-friendly toast message
    Utils.showToast(message, toastType);
    
    // Auto-switch tabs for better UX (only for specific cases)
    this.autoSwitchTabOnError(error.code, context);
}

// Improved auto-switch method
autoSwitchTabOnError(errorCode, context) {
    setTimeout(() => {
        const signupEmail = document.getElementById('signupEmail')?.value;
        const loginEmail = document.getElementById('loginEmail')?.value;
        
        switch (errorCode) {
            case 'auth/email-already-in-use':
                // If user tries to sign up with existing email, switch to login
                if (context === 'signup') {
                    this.switchTab('login');
                    // Pre-fill the email in login form
                    if (signupEmail && document.getElementById('loginEmail')) {
                        document.getElementById('loginEmail').value = signupEmail;
                        // Focus on password field for better UX
                        setTimeout(() => {
                            const loginPassword = document.getElementById('loginPassword');
                            if (loginPassword) loginPassword.focus();
                        }, 300);
                    }
                }
                break;
                
            case 'auth/user-not-found':
                // If user tries to login with non-existent email, switch to signup
                if (context === 'login') {
                    this.switchTab('signup');
                    // Pre-fill the email in signup form
                    if (loginEmail && document.getElementById('signupEmail')) {
                        document.getElementById('signupEmail').value = loginEmail;
                        // Focus on name field for better UX
                        setTimeout(() => {
                            const signupName = document.getElementById('signupName');
                            if (signupName) signupName.focus();
                        }, 300);
                    }
                }
                break;
                
            case 'auth/invalid-login-credentials':
            case 'auth/invalid-credential':
                // For invalid credentials, clear password field and focus on it
                if (context === 'login') {
                    const loginPassword = document.getElementById('loginPassword');
                    if (loginPassword) {
                        loginPassword.value = '';
                        setTimeout(() => {
                            loginPassword.focus();
                        }, 300);
                    }
                }
                break;
        }
    }, 1500);
  }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
