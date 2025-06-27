class Auth {
    static isAuthenticated() {
        return localStorage.getItem('access_token') !== null;
    }

    static getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    static login(tokenData) {
        localStorage.setItem('access_token', tokenData.access);
        localStorage.setItem('refresh_token', tokenData.refresh);
        localStorage.setItem('user', JSON.stringify(tokenData.user));
        api.token = tokenData.access;
    }

    static logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        api.token = null;
        window.location.href = '/login/';
    }

    static updateNavbar() {
        const navbarContent = document.getElementById('navbarContent');
        if (this.isAuthenticated()) {
            const user = this.getUser();
            navbarContent.innerHTML = `
                <div class="navbar-nav">
                    <a class="nav-link" href="/dashboard/">Dashboard</a>
                    <a class="nav-link" href="/statistics/">İstatistikler</a>
                    <div class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                            <i class="fas fa-user me-1"></i>${user.username}
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="Auth.logout()">
                                <i class="fas fa-sign-out-alt me-2"></i>Çıkış Yap
                            </a></li>
                        </ul>
                    </div>
                </div>
            `;
        } else {
            navbarContent.innerHTML = `
                <div class="navbar-nav">
                    <a class="nav-link" href="/login/">Giriş Yap</a>
                </div>
            `;
        }
    }

    static checkAuth() {
        if (!this.isAuthenticated() && !window.location.pathname.includes('/login/')) {
            window.location.href = '/login/';
        }
    }
}