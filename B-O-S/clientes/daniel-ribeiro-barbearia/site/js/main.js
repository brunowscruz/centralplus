// ============================================
// MAIN APPLICATION
// ============================================

class BarberShopApp {
    constructor() {
        this.DOM = {
            preloader: document.querySelector('[data-preloader]'),
            preloaderSkip: document.querySelector('[data-preloader-skip]'),
            nav: document.querySelector('[data-nav]'),
            navToggle: document.querySelector('[data-nav-toggle]'),
            mobileMenu: document.querySelector('[data-mobile-menu]'),
            magneticElements: document.querySelectorAll('[data-magnetic]'),
            heroElements: document.querySelectorAll('[data-hero-element]'),
            revealElements: document.querySelectorAll('[data-reveal]'),
            parallaxElements: document.querySelectorAll('[data-parallax]'),
            spotlightCards: document.querySelectorAll('[data-spotlight]'),
            marquee: document.querySelector('[data-marquee]'),
            statNumbers: document.querySelectorAll('[data-count]')
        };

        this.state = {
            isPreloaderActive: true,
            isMobileMenuOpen: false,
            cursorX: 0,
            cursorY: 0,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };

        this.lenis = null;
        this.init();
    }

    init() {
        // Prevent animations if reduced motion is preferred
        if (this.state.reducedMotion) {
            this.handleReducedMotion();
        }

        this.initPreloader();
        this.initNavigation();
        this.initLenis();
        this.initGSAP();
        this.initHeroAnimation();
        this.initScrollAnimations();
        this.initSpotlightEffect();
        this.initMarquee();
        this.initMagneticEffect();
        this.initVideoPlayers();
        this.initFormHandlers();
    }

    handleReducedMotion() {
        document.body.classList.add('reduced-motion');
        // Skip preloader automatically
        setTimeout(() => {
            this.hidePreloader();
        }, 100);
    }

    // ============================================
    // PRELOADER
    // ============================================

    initPreloader() {
        if (this.state.reducedMotion) return;

        // Auto hide after 2.5 seconds
        setTimeout(() => {
            if (this.state.isPreloaderActive) {
                this.hidePreloader();
            }
        }, 2500);

        // Skip button
        this.DOM.preloaderSkip?.addEventListener('click', () => {
            this.hidePreloader();
        });
    }

    hidePreloader() {
        this.state.isPreloaderActive = false;

        gsap.to(this.DOM.preloader, {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
                this.DOM.preloader.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            }
        });
    }

    // ============================================
    // NAVIGATION
    // ============================================

    initNavigation() {
        // Scroll effect
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 100) {
                this.DOM.nav.classList.add('scrolled');
            } else {
                this.DOM.nav.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        });

        // Mobile menu toggle
        this.DOM.navToggle?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close mobile menu on link click
        const mobileLinks = this.DOM.mobileMenu?.querySelectorAll('a');
        mobileLinks?.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));

                if (target) {
                    this.lenis?.scrollTo(target, {
                        offset: -100,
                        duration: 1.5
                    });
                }
            });
        });
    }

    toggleMobileMenu() {
        this.state.isMobileMenuOpen = !this.state.isMobileMenuOpen;

        if (this.state.isMobileMenuOpen) {
            this.DOM.mobileMenu.classList.add('active');
            this.DOM.navToggle.classList.add('active');
            document.body.classList.add('no-scroll');
        } else {
            this.closeMobileMenu();
        }
    }

    closeMobileMenu() {
        this.state.isMobileMenuOpen = false;
        this.DOM.mobileMenu.classList.remove('active');
        this.DOM.navToggle.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    // ============================================
    // LENIS SMOOTH SCROLL
    // ============================================

    initLenis() {
        if (this.state.reducedMotion) {
            return;
        }

        this.lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            smoothWheel: true,
            syncTouch: false,
            touchMultiplier: 2
        });

        // Integrate with GSAP ScrollTrigger
        this.lenis.on('scroll', ScrollTrigger.update);

        // Single RAF driver (do not also run a manual requestAnimationFrame
        // loop here — driving lenis.raf() from two independent time bases
        // at once corrupts its internal delta and freezes wheel scrolling).
        gsap.ticker.add((time) => {
            this.lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
    }

    // ============================================
    // GSAP SETUP
    // ============================================

    initGSAP() {
        gsap.registerPlugin(ScrollTrigger);

        // Configure ScrollTrigger
        ScrollTrigger.defaults({
            markers: false
        });

        // Refresh on load
        window.addEventListener('load', () => {
            ScrollTrigger.refresh();
        });
    }

    // ============================================
    // HERO ANIMATIONS
    // ============================================

    initHeroAnimation() {
        if (this.state.reducedMotion) {
            // Just show elements without animation
            gsap.set(this.DOM.heroElements, { opacity: 1 });
            return;
        }

        // Create master timeline
        const tl = gsap.timeline({
            delay: 2.8 // After preloader
        });

        // Animate subtitle
        tl.to('.hero__subtitle', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out'
        });

        // Animate title words
        tl.to('.hero__title-word', {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.1,
            ease: 'power3.out'
        }, '-=0.4');

        // Animate description
        tl.to('.hero__description', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, '-=0.6');

        // Animate CTAs
        tl.to('.hero__cta', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, '-=0.4');

        // Animate floating video card
        tl.to('.hero__video-card', {
            opacity: 1,
            duration: 1,
            ease: 'power3.out'
        }, '-=0.6');

        // Animate scroll indicator
        tl.to('.hero__scroll', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out'
        }, '-=0.4');

        // Parallax effect on hero background layers
        this.DOM.parallaxElements.forEach(el => {
            if (el.closest('.hero')) {
                const speed = parseFloat(el.dataset.speed) || 0.5;

                gsap.to(el, {
                    y: () => window.innerHeight * speed,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '.hero',
                        start: 'top top',
                        end: 'bottom top',
                        scrub: true
                    }
                });
            }
        });
    }

    // ============================================
    // SCROLL ANIMATIONS
    // ============================================

    initScrollAnimations() {
        if (this.state.reducedMotion) {
            gsap.set(this.DOM.revealElements, { opacity: 1 });
            return;
        }

        // Reveal elements on scroll
        this.DOM.revealElements.forEach((el, index) => {
            gsap.from(el, {
                y: 60,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    end: 'top 65%',
                    toggleActions: 'play none none none'
                }
            });
        });

        // Parallax elements (excluding hero)
        this.DOM.parallaxElements.forEach(el => {
            if (!el.closest('.hero')) {
                const speed = parseFloat(el.dataset.speed) || 0.2;
                const direction = speed > 0 ? -1 : 1;

                gsap.to(el, {
                    y: () => direction * 100 * Math.abs(speed),
                    ease: 'none',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true
                    }
                });
            }
        });

        // Stat counter animation
        this.DOM.statNumbers.forEach(stat => {
            const target = parseInt(stat.dataset.count);

            ScrollTrigger.create({
                trigger: stat,
                start: 'top 80%',
                onEnter: () => {
                    gsap.to(stat, {
                        innerText: target,
                        duration: 2,
                        snap: { innerText: 1 },
                        ease: 'power2.out',
                        onUpdate: function() {
                            stat.innerText = Math.ceil(stat.innerText);
                        }
                    });
                },
                once: true
            });
        });

        // Gallery image scale on scroll
        const galleryItems = document.querySelectorAll('.gallery__item');

        galleryItems.forEach(item => {
            const image = item.querySelector('.gallery__image');

            ScrollTrigger.create({
                trigger: item,
                start: 'top bottom',
                end: 'bottom top',
                onEnter: () => {
                    gsap.to(image, {
                        scale: 1,
                        duration: 1.2,
                        ease: 'power2.out'
                    });
                },
                once: true
            });
        });
    }

    // ============================================
    // SPOTLIGHT EFFECT
    // ============================================

    initSpotlightEffect() {
        if (this.state.reducedMotion) return;

        this.DOM.spotlightCards.forEach(card => {
            const spotlight = card.querySelector('.service-card__spotlight');

            if (!spotlight) return;

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const percentX = (x / rect.width) * 100;
                const percentY = (y / rect.height) * 100;

                spotlight.style.setProperty('--mouse-x', `${percentX}%`);
                spotlight.style.setProperty('--mouse-y', `${percentY}%`);
            });
        });
    }

    // ============================================
    // MARQUEE
    // ============================================

    initMarquee() {
        if (!this.DOM.marquee || this.state.reducedMotion) return;

        // Duplicate content for seamless loop
        const content = this.DOM.marquee.querySelector('.marquee__content');
        if (content) {
            const clone = content.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            this.DOM.marquee.querySelector('.marquee__inner').appendChild(clone);
        }

        // Pause on hover
        this.DOM.marquee.addEventListener('mouseenter', () => {
            const contents = this.DOM.marquee.querySelectorAll('.marquee__content');
            contents.forEach(c => {
                c.style.animationPlayState = 'paused';
            });
        });

        this.DOM.marquee.addEventListener('mouseleave', () => {
            const contents = this.DOM.marquee.querySelectorAll('.marquee__content');
            contents.forEach(c => {
                c.style.animationPlayState = 'running';
            });
        });
    }

    // ============================================
    // MAGNETIC EFFECT
    // ============================================

    initMagneticEffect() {
        if (this.state.reducedMotion) return;
        if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

        this.DOM.magneticElements.forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                gsap.to(el, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                gsap.to(el, {
                    x: x * 0.3,
                    y: y * 0.3,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            el.addEventListener('mouseleave', () => {
                gsap.to(el, {
                    x: 0,
                    y: 0,
                    scale: 1,
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.5)'
                });
            });
        });
    }

    // ============================================
    // VIDEO PLAYERS
    // ============================================

    initVideoPlayers() {
        const videoItems = document.querySelectorAll('.video-showcase__item');

        videoItems.forEach(item => {
            const video = item.querySelector('.video-showcase__video');
            const playButton = item.querySelector('.video-showcase__play');
            const overlay = item.querySelector('.video-showcase__overlay');

            if (!video || !playButton || !overlay) return;

            // Play button click
            playButton.addEventListener('click', () => {
                video.play();
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            });

            // Video click to play/pause
            video.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            });

            // Show overlay when video ends
            video.addEventListener('ended', () => {
                overlay.style.display = 'flex';
                setTimeout(() => {
                    overlay.style.opacity = '1';
                }, 10);
            });

            // Pause other videos when one plays
            video.addEventListener('play', () => {
                document.querySelectorAll('.video-showcase__video').forEach(v => {
                    if (v !== video && !v.paused) {
                        v.pause();
                    }
                });
            });
        });

        // Pause hero video if it exists and reduce motion is enabled
        const heroVideo = document.querySelector('.hero__video');
        if (heroVideo && this.state.reducedMotion) {
            heroVideo.pause();
        }
    }

    // ============================================
    // FORM HANDLERS
    // ============================================

    initFormHandlers() {
        const form = document.querySelector('.contact__form');

        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Here you would normally send to backend
            console.log('Form submitted:', data);

            // Show success message (you can customize this)
            alert('Obrigado! Entraremos em contato em breve.');

            // Reset form
            form.reset();
        });

        // Phone mask
        const phoneInput = document.getElementById('phone');

        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');

                if (value.length <= 11) {
                    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                }

                e.target.value = value;
            });
        }
    }
}

// ============================================
// INITIALIZE APP
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BarberShopApp();
    });
} else {
    new BarberShopApp();
}

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is hidden
        gsap.globalTimeline.pause();
    } else {
        // Resume when tab is visible
        gsap.globalTimeline.resume();
    }
});

// Debounce resize events
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh();
    }, 250);
});
