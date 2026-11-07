/* ==========================================================================
   MediPredict — Hybrid Top Bar + Closable Sidebar System Controller
   ========================================================================== */

// Immediately apply saved theme before DOM render to prevent theme flash
(function applyInitialTheme() {
    const savedTheme = localStorage.getItem('mediTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
    initThemeController();
    initScrollPortal();
    initSidebarDrawer();
    initScrollReveals();
    initWorkflowCardInteraction();
    initSessionState();
});

/**
 * Light Mode / Dark Mode Theme Switcher Controller
 */
function initThemeController() {
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mediTheme', theme);
        
        // Update button icons across navbar and sidebar
        themeToggleBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                if (theme === 'light') {
                    icon.className = 'fa-solid fa-moon';
                    btn.setAttribute('title', 'Switch to Dark Mode');
                } else {
                    icon.className = 'fa-solid fa-sun';
                    btn.setAttribute('title', 'Switch to Light Mode');
                }
            }
        });
    }

    // Initial setup from current attribute
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme);

    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    });
}

/**
 * Scroll-Driven Health Intelligence Portal Animation
 * Driven by window scroll position. Fully reversible on upward scroll.
 */
function initScrollPortal() {
    const heroContainer = document.getElementById('heroPortalContainer');
    const portalLeft = document.getElementById('portalLeft');
    const portalRight = document.getElementById('portalRight');
    const wordmarkMedi = document.getElementById('wordmarkMedi');
    const wordmarkPredict = document.getElementById('wordmarkPredict');
    const heroVizBackdrop = document.getElementById('heroVizBackdrop');
    const pulseNodes = document.querySelectorAll('.pulse-node');

    if (!heroContainer || !portalLeft || !portalRight) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        portalLeft.style.transform = 'translateX(-100%)';
        portalRight.style.transform = 'translateX(100%)';
        if (heroVizBackdrop) {
            heroVizBackdrop.style.opacity = '1';
            heroVizBackdrop.style.pointerEvents = 'auto';
        }
        return;
    }

    let ticking = false;

    function updatePortal() {
        const rect = heroContainer.getBoundingClientRect();
        const totalScrollable = heroContainer.offsetHeight - window.innerHeight;

        if (totalScrollable <= 0) {
            ticking = false;
            return;
        }

        // Calculate progress from 0 (top closed state) to 1 (fully revealed)
        const currentScroll = Math.max(0, -rect.top);
        const progress = Math.min(1, Math.max(0, currentScroll / totalScrollable));

        // Move Left Panel left (>100px displacement)
        portalLeft.style.transform = `translateX(${-progress * 105}%)`;
        
        // Move Right Panel right (>100px displacement)
        portalRight.style.transform = `translateX(${progress * 105}%)`;

        // Expand and separate title spans
        if (wordmarkMedi) {
            wordmarkMedi.style.transform = `translateX(${-progress * 60}px)`;
        }
        if (wordmarkPredict) {
            wordmarkPredict.style.transform = `translateX(${progress * 60}px)`;
        }

        // Fade out cover subtext elements and scroll pill
        const coverSubtext = document.querySelectorAll('.hero-portal-subtext, .hero-portal-tag, .hero-panel-chip');
        const scrollPill = document.getElementById('heroScrollPill');
        coverSubtext.forEach(el => {
            el.style.opacity = Math.max(0, 1 - progress * 3.0).toString();
        });
        if (scrollPill) {
            scrollPill.style.opacity = Math.max(0, 1 - progress * 3.5).toString();
        }

        // Fade in & scale central health visualization only after panels begin sliding
        if (heroVizBackdrop) {
            if (progress <= 0.02) {
                heroVizBackdrop.style.opacity = '0';
                heroVizBackdrop.style.pointerEvents = 'none';
            } else {
                heroVizBackdrop.style.opacity = Math.min(1, progress * 1.5).toString();
                heroVizBackdrop.style.pointerEvents = 'auto';
                heroVizBackdrop.style.transform = `scale(${1.1 - progress * 0.1})`;
            }
        }

        // Displace accent pulse nodes outward
        pulseNodes.forEach((node, idx) => {
            const factor = (idx + 1) * 20;
            node.style.transform = `translate(${progress * factor}px, ${-progress * factor}px)`;
        });

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updatePortal);
            ticking = true;
        }
    }, { passive: true });

    // Initial trigger
    updatePortal();
}

/**
 * Closable Sidebar Drawer Controller
 */
function initSidebarDrawer() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('sidebarDrawer');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock background scroll when drawer is open
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar && sidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
}

/**
 * Intersection Observer for One-Time Section Reveals
 */
function initScrollReveals() {
    const revealElements = document.querySelectorAll('.flow-card, .feature-hairline-item, .roster-row');
    
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target); // Trigger once
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Session State Display Handler
 */
/**
 * Workflow card interaction: no card is permanently highlighted.
 * The accent border appears only while the pointer/focus is on a card.
 */
function initWorkflowCardInteraction() {
    const cards = document.querySelectorAll('.step-card');
    cards.forEach(card => {
        card.classList.remove('is-active');
        card.addEventListener('mouseenter', () => card.classList.add('is-active'));
        card.addEventListener('mouseleave', () => card.classList.remove('is-active'));
        card.addEventListener('focusin', () => card.classList.add('is-active'));
        card.addEventListener('focusout', () => card.classList.remove('is-active'));
    });
}

async function initSessionState() {
    if (typeof mpCheckSession !== 'function') return;

    const user = await mpCheckSession();
    
    // Top Bar Link
    const navSignInLink = document.getElementById('navSignInLink');
    if (navSignInLink) {
        if (user) {
            navSignInLink.innerText = 'Dashboard';
            navSignInLink.href = 'dashboard.html';
        } else {
            navSignInLink.innerText = 'Sign In';
            navSignInLink.href = 'login.html';
        }
    }

    // Sidebar User Card & Auth Links
    const sidebarUserInfo = document.getElementById('sidebarUserInfo');
    const sidebarAuthLink = document.getElementById('sidebarAuthLink');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');

    if (user) {
        if (sidebarUserInfo) sidebarUserInfo.style.display = 'flex';
        if (sidebarAuthLink) sidebarAuthLink.style.display = 'none';
        if (sidebarUserName) sidebarUserName.innerText = user.name ? user.name.split(' ')[0] : 'User';
        if (sidebarUserAvatar) sidebarUserAvatar.innerText = user.name ? user.name.charAt(0).toUpperCase() : 'U';

        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await mpLogout();
            });
        }
    } else {
        if (sidebarUserInfo) sidebarUserInfo.style.display = 'none';
        if (sidebarAuthLink) sidebarAuthLink.style.display = 'flex';
    }
}
