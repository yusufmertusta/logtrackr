document.addEventListener('DOMContentLoaded', function() {
    const authButtonsContainer = document.getElementById('auth-buttons');
    
    // Auth object kontrolü (bu objenin base.html'de tanımlı olduğunu varsayıyorum)
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
        // Kullanıcı giriş yapmış - sadece dashboard butonu
        authButtonsContainer.innerHTML = `
            <a href="/dashboard/" class="btn auth-btn btn-dashboard btn-lg">
                <i class="fas fa-chart-bar me-2"></i>Dashboard'a Git
            </a>
        `;
    } else {
        // Kullanıcı giriş yapmamış - giriş yap ve kayıt ol butonları
        authButtonsContainer.innerHTML = `
            <a href="/login/" class="btn auth-btn btn-login btn-lg me-3">
                <i class="fas fa-sign-in-alt me-2"></i>Giriş Yap
            </a>
            <!-- <a href="/login/#" class="btn auth-btn btn-register btn-lg">
                <i class="fas fa-user-plus me-2"></i>Kayıt Ol
            </a> -->
        `;
    }
    
    // Smooth scroll effect for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add intersection observer for animation triggers
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
});
