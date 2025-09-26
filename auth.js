// Authentication JavaScript
class AuthApp {
    constructor() {
        this.currentForm = 'login';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkRedirect();
    }

    bindEvents() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchForm('login'));
        document.getElementById('signupTab').addEventListener('click', () => this.switchForm('signup'));
        
        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('resetPasswordForm').addEventListener('submit', (e) => this.handleResetPassword(e));
        
        // Other buttons
        document.getElementById('forgotPassword').addEventListener('click', () => this.switchForm('reset'));
        document.getElementById('backToLogin').addEventListener('click', () => this.switchForm('login'));
        document.getElementById('googleLoginBtn').addEventListener('click', () => this.signInWithGoogle('login'));
        document.getElementById('googleSignupBtn').addEventListener('click', () => this.signInWithGoogle('signup'));

        // Real-time validation
        document.getElementById('signupPassword').addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        document.getElementById('loginEmail').addEventListener('blur', (e) => this.validateEmail(e.target));
        document.getElementById('signupEmail').addEventListener('blur', (e) => this.validateEmail(e.target));
    }

    switchForm(formName) {
        // Hide all forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
        
        // Show selected form
        if (formName === 'login') {
            document.getElementById('loginForm').classList.add('active');
            document.getElementById('loginTab').classList.add('active');
        } else if (formName === 'signup') {
            document.getElementById('signupForm').classList.add('active');
            document.getElementById('signupTab').classList.add('active');
        } else if (formName === 'reset') {
            document.getElementById('resetPasswordForm').classList.add('active');
        }
        
        this.currentForm = formName;
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading(true);

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            if (!utils.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            await this.handleSuccessfulAuth(userCredential.user, 'login');
            
        } catch (error) {
            this.showLoading(false);
            utils.showToast(this.getErrorMessage(error), 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        this.showLoading(true);

        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            if (!name.trim()) {
                throw new Error('Please enter your name');
            }

            if (!utils.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Create user document in Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name.trim(),
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            await this.handleSuccessfulAuth(userCredential.user, 'signup');
            
        } catch (error) {
            this.showLoading(false);
            utils.showToast(this.getErrorMessage(error), 'error');
        }
    }

    async handleResetPassword(e) {
        e.preventDefault();
        this.showLoading(true);

        const email = document.getElementById('resetEmail').value;

        try {
            if (!utils.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            await auth.sendPasswordResetEmail(email);
            this.showLoading(false);
            
            utils.showToast('Password reset email sent! Check your inbox.', 'success');
            setTimeout(() => this.switchForm('login'), 2000);
            
        } catch (error) {
            this.showLoading(false);
            utils.showToast(this.getErrorMessage(error), 'error');
        }
    }

    async signInWithGoogle(context) {
        this.showLoading(true);

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            const userCredential = await auth.signInWithPopup(provider);
            const user = userCredential.user;

            if (context === 'signup') {
                // Create user document for new Google signups
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    isGoogleUser: true
                }, { merge: true });
            }

            await this.handleSuccessfulAuth(user, 'google');
            
        } catch (error) {
            this.showLoading(false);
            utils.showToast(this.getErrorMessage(error), 'error');
        }
    }

    async handleSuccessfulAuth(user, method) {
        // Update last login
        await db.collection('users').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Store user info in localStorage
        localStorage.setItem('userToken', user.uid);
        localStorage.setItem('userName', user.displayName || document.getElementById('signupName')?.value || 'User');
        localStorage.setItem('userEmail', user.email);

        utils.showToast(
            method === 'login' ? 'Welcome back!' : 
            method === 'signup' ? 'Account created successfully!' : 'Signed in with Google!',
            'success'
        );

        // Redirect to main app after a brief delay
        setTimeout(() => {
            window.location.href = 'app.html';
        }, 1000);
    }

    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        
        let strength = 0;
        if (password.length >= 6) strength += 25;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;

        strengthBar.style.width = strength + '%';
        
        if (strength < 50) {
            strengthBar.style.background = '#EF4444';
            strengthText.textContent = 'Weak password';
        } else if (strength < 75) {
            strengthBar.style.background = '#F59E0B';
            strengthText.textContent = 'Good password';
        } else {
            strengthBar.style.background = '#10B981';
            strengthText.textContent = 'Strong password';
        }
    }

    validateEmail(input) {
        const email = input.value;
        if (email && !utils.validateEmail(email)) {
            input.style.borderColor = '#EF4444';
        } else {
            input.style.borderColor = '';
        }
    }

    showLoading(show) {
        const loadingEl = document.getElementById('authLoading');
        if (show) {
            loadingEl.style.display = 'flex';
        } else {
            loadingEl.style.display = 'none';
        }
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Invalid email address format';
            case 'auth/user-disabled':
                return 'This account has been disabled';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection';
            default:
                return error.message || 'An error occurred. Please try again.';
        }
    }

    checkRedirect() {
        // If user is already authenticated, redirect to app
        auth.onAuthStateChanged((user) => {
            if (user) {
                window.location.href = 'app.html';
            }
        });
    }
}

// Initialize the auth app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthApp();
});
