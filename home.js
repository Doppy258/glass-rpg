document.addEventListener('DOMContentLoaded', function () {
      // Initialize text reveal animations
      initTextReveal();

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Restore the interactive network background in the hero.
      if (!reducedMotion && window.VANTA?.NET && document.getElementById('vanta-bg')) {
        const vantaEffect = window.VANTA.NET({
          el: '#vanta-bg',
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          color: 0x60a5fa,
          backgroundColor: 0x000000,
          points: 7.5,
          maxDistance: 28,
          spacing: 14,
          showDots: false
        });
        window.addEventListener('pagehide', () => vantaEffect.destroy(), { once: true });
      }

      // Initialize slideshow
      initSlideshow();

      // About section no longer uses slideshow

      // Initialize video testimonials

      // Initialize diamond background
      if (!reducedMotion) initDiamondBackground();

      // Initialize event icon slideshow
      initEventSlideshow();
      createMarqueeClones();
      initVideoModal();

      // Smooth scrolling and scroll-based animations
      initRevealUtilities();
      if (!reducedMotion) initParallax();
      initScrollProgress();

      // Phone number auto-formatting (international-friendly)
      const phoneInput = document.getElementById('phone');
      const countryCodeSelect = document.getElementById('countryCode');
      if (phoneInput && countryCodeSelect) {
        phoneInput.addEventListener('input', (e) => {
          let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits
          const countryCode = countryCodeSelect.value;

          // Limit to 15 digits (international standard max)
          if (value.length > 15) {
            value = value.slice(0, 15);
          }

          // Format based on country code
          let formatted = '';
          if (countryCode === '+1' && value.length > 0) {
            // US/Canada format: (XXX) XXX-XXXX
            if (value.length > 10) {
              value = value.slice(0, 10);
            }
            formatted = '(' + value.substring(0, 3);
            if (value.length >= 3) {
              formatted += ') ' + value.substring(3, 6);
            }
            if (value.length >= 6) {
              formatted += '-' + value.substring(6, 10);
            }
          } else {
            // International format: XXX XXX XXXX (space-separated groups)
            if (value.length > 0) {
              const parts = [];
              for (let i = 0; i < value.length; i += 3) {
                parts.push(value.substring(i, i + 3));
              }
              formatted = parts.join(' ');
            }
          }

          e.target.value = formatted;
        });

        // Re-format when country code changes
        countryCodeSelect.addEventListener('change', () => {
          if (phoneInput.value) {
            phoneInput.dispatchEvent(new Event('input'));
          }
        });
      }
    });

    // Text reveal animation
    function initTextReveal() {
      const textReveals = document.querySelectorAll('.text-reveal');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, { threshold: 0.1 });

      textReveals.forEach(element => {
        observer.observe(element);
      });
    }

    // Three-image carousel with side-by-side display
    function initSlideshow() {
      const slides = document.querySelectorAll('.carousel-slide');
      if (!slides.length) return;

      let currentSlide = 0;
      const totalSlides = slides.length;

      // Initialize carousel
      function updateCarousel() {
        // Remove all classes first
        slides.forEach(slide => {
          slide.classList.remove('active', 'prev', 'next');
        });

        // Set current slide as active
        slides[currentSlide].classList.add('active');

        // Set previous slide
        const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
        slides[prevIndex].classList.add('prev');

        // Set next slide
        const nextIndex = (currentSlide + 1) % totalSlides;
        slides[nextIndex].classList.add('next');
      }

      // Keep the initial image stable for Core Web Vitals; visitors can select a slide.
      slides.forEach((slide, index) => {
        slide.addEventListener('click', () => {
          currentSlide = index;
          updateCarousel();
        });
      });
    }

    // About section no longer uses slideshow animation



    // Diamond background effect on scroll
    function initDiamondBackground() {
      const diamondBg = document.querySelector('.diamond-bg');
      const diamondFill = document.querySelector('.diamond-fill');

      if (!diamondBg || !diamondFill) return;

      let lastScrollY = window.scrollY;
      const scrollThreshold = 100;

      // Check initial scroll position
      if (window.scrollY > scrollThreshold) {
        diamondBg.classList.add('visible');

        // Add a slight delay for the diamond fill
        setTimeout(() => {
          diamondFill.classList.add('visible');
        }, 200);
      }

      // Listen for scroll events
      window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > scrollThreshold && lastScrollY <= scrollThreshold) {
          // Scrolled down past threshold
          diamondBg.classList.add('visible');

          // Add a slight delay for the diamond fill
          setTimeout(() => {
            diamondFill.classList.add('visible');
          }, 200);
        } else if (currentScrollY <= scrollThreshold && lastScrollY > scrollThreshold) {
          // Scrolled up past threshold
          diamondFill.classList.remove('visible');

          // Add a slight delay for the diamond background
          setTimeout(() => {
            diamondBg.classList.remove('visible');
          }, 200);
        }

        lastScrollY = currentScrollY;
      });
    }


    // Smooth-scroll and focus contact form
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#contact-form"]');
      if (!link) return;
      const target = document.getElementById('contact-form');
      if (!target) return;
      e.preventDefault();
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      target.scrollIntoView({ behavior, block: 'start' });
      // Focus first input after scroll finishes
      setTimeout(() => {
        const first = target.querySelector('input, select, textarea');
        if (first) first.focus({ preventScroll: true });
      }, 500);
    });

    // Contact form: validate, send email, then redirect to Calendly
    document.addEventListener('submit', async (e) => {
      const form = e.target.closest('#contact-form');
      if (!form) return;
      e.preventDefault();
      const fields = ['name', 'email', 'countryCode', 'phone', 'role', 'grade', 'region', 'organization', 'eventCode', 'timePerWeek'];
      for (const id of fields) {
        const el = form.querySelector(`#${id}`);
        if (!el || !el.value || !String(el.value).trim()) {
          el && el.focus();
          return;
        }
      }
      const name = form.name.value.trim();
      const role = form.role.value.trim();
      const email = form.email.value.trim();
      const company = (form.company && form.company.value || '').trim();
      const countryCode = form.countryCode.value.trim();
      const phone = form.phone.value.trim();
      const school = '';
      const region = form.region.value.trim();
      const grade = form.grade.value.trim();
      const organization = form.organization.value.trim();
      const eventCode = form.eventCode.value.trim();
      const timePerWeek = form.timePerWeek.value.trim();

      // Extra validation (pattern checks) before sending
      // Simple email pattern: must include @ and a dot extension
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailPattern.test(email)) {
        alert('Please enter a valid email address.');
        form.email.focus();
        return;
      }

      // Phone number validation: international-friendly
      const phoneDigits = phone.replace(/\D/g, '');
      if (countryCode === '+1') {
        // US/Canada: must be exactly 10 digits
        if (phoneDigits.length !== 10) {
          alert('Please enter a valid 10-digit phone number for US/Canada.');
          form.phone.focus();
          return;
        }
      } else {
        // International: must be between 6 and 15 digits
        if (phoneDigits.length < 6 || phoneDigits.length > 15) {
          alert('Please enter a valid phone number (6-15 digits).');
          form.phone.focus();
          return;
        }
      }

      const calendlyUrl = 'https://calendly.com/erikawu47/15min';

      // Send through serverless Gmail (uses gmail_user/gmail_pass on Vercel)
      try {
        const base = window.location.origin.replace(/\/$/, '');
        const resp = await fetch(`${base}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            role,
            email,
            countryCode,
            phone,
            grade,
            region,
            organization,
            eventCode,
            timePerWeek,
            company,
          }),
        });
        if (!resp.ok) {
          let errText = '';
          try {
            const j = await resp.json();
            errText = j && (j.details || j.error) || '';
          } catch (_) {
            errText = await resp.text().catch(() => '');
          }
          console.error('Email send failed', resp.status, errText);
          alert(`Sorry, we could not send your message right now. (HTTP ${resp.status})\n${errText || ''}`);
          return;
        }
        // Clear fields to mirror your other site behavior
        form.reset();
        // Redirect to Calendly in same tab to avoid popup blockers
        window.location.href = calendlyUrl;
      } catch (err) {
        console.error('Email send error', err);
        alert('Sorry, we could not send your message right now. Please try again.');
      }
    });

    // Event icon slideshow
    function initEventSlideshow() {
      const eventItems = document.querySelectorAll('.event-item');
      if (!eventItems.length) return;

      let currentItem = 0;

      function showNextItem() {
        eventItems.forEach(item => item.classList.remove('active'));
        eventItems[currentItem].classList.add('active');
        currentItem = (currentItem + 1) % eventItems.length;
      }

      // Initial call
      showNextItem();

      // Change item every 3 seconds when motion has not been reduced.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setInterval(showNextItem, 3000);
      }
    }

    // Video modal player
    function initVideoModal() {
      const marquee = document.querySelector('.video-marquee');
      if (!marquee) return;

      // Create modal markup once
      let modal = document.getElementById('videoModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.className = 'video-modal hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Student testimonial video');
        modal.innerHTML = `
          <div class="vm-backdrop" data-close></div>
          <div class="vm-dialog" tabindex="-1">
            <button class="vm-close" type="button" aria-label="Close testimonial video" data-close>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <video class="vm-player" controls playsinline></video>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const player = modal.querySelector('.vm-player');
      const closeButton = modal.querySelector('.vm-close');
      let opener = null;

      const open = (src, button) => {
        opener = button;
        player.src = src;
        player.currentTime = 0;
        modal.classList.remove('hidden');
        document.documentElement.style.overflow = 'hidden';
        closeButton.focus();
        setTimeout(() => player.play().catch(() => { }), 50);
      };
      const close = () => {
        player.pause();
        player.src = '';
        modal.classList.add('hidden');
        document.documentElement.style.overflow = '';
        opener?.focus();
        opener = null;
      };

      modal.addEventListener('click', (e) => {
        const target = e.target;
        if (target && (target.hasAttribute('data-close') || target.closest('[data-close]'))) {
          close();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('hidden')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') {
          const focusable = [...modal.querySelectorAll('button, video[controls]')];
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });

      // Delegate click from play buttons
      marquee.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.vm-play');
        if (!playBtn) return;
        const item = playBtn.closest('.vm-item');
        if (!item) return;
        const src = item.getAttribute('data-video-src');
        if (src) open(src, playBtn);
      });
    }


    // Reveal & stagger utilities
    function initRevealUtilities() {
      // Auto-apply reveals to common elements (avoid elements that animate via transform)
      document.querySelectorAll('.section .section-title, .section .section-subtitle').forEach(el => { el.classList.add('reveal'); el.classList.add('reveal-tilt'); });
      document.querySelectorAll('.hero-cta, .typing-container').forEach(el => { el.classList.add('reveal'); el.classList.add('reveal-zoom'); });
      document.querySelectorAll('.faq-item, .instagram-card, .card').forEach(el => { el.classList.add('reveal'); el.classList.add('reveal-up'); el.classList.add('reveal-glow'); });
      // Subtle fades for heavy movers (items only, not tracks)
      document.querySelectorAll('.vm-item, .wm-card, .event-item').forEach(el => { el.classList.add('reveal-fade'); });

      // Ensure complex animated containers remain visible (no masking on these)
      document.querySelectorAll('.carousel, .carousel-container, .event-scroller, .event-track, .image-scroller, .image-scroller-track, .written-marquee, .wm-stack, .vm-track, .vm-item, .wm-card').forEach(el => {
        el.classList.remove('reveal', 'reveal-mask', 'reveal-blur', 'reveal-zoom', 'reveal-tilt', 'reveal-glow', 'in');
        el.style.clipPath = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.style.filter = '';
      });

      const singleReveals = document.querySelectorAll('[data-reveal], .reveal, .reveal-tilt, .reveal-zoom, .reveal-blur, .reveal-up, .reveal-fade');
      const staggerGroups = document.querySelectorAll('[data-stagger], .stagger');

      const singleObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            singleObs.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

      const staggerObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            staggerObs.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

      singleReveals.forEach(el => singleObs.observe(el));
      staggerGroups.forEach(el => staggerObs.observe(el));

      // Section ambient glow toggle
      const sections = document.querySelectorAll('.section');
      const secObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          entry.target.classList.toggle('section-in', entry.isIntersecting);
        });
      }, { threshold: 0.2 });
      sections.forEach(s => secObs.observe(s));
    }

    // Lightweight parallax using data attributes
    function initParallax() {
      // Disable hero parallax on small screens to prevent overlap/cutoff
      if (window.innerWidth <= 900) {
        return;
      }
      // Apply defaults if author didn't mark elements (avoid transform-animated tracks)
      const defaults = document.querySelectorAll('.hero .container, .instagram-card');
      defaults.forEach(el => { if (el && !el.hasAttribute('data-parallax')) el.setAttribute('data-parallax', '0.12'); });

      const parallaxEls = document.querySelectorAll('[data-parallax]');
      if (!parallaxEls.length) return;
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const viewH = window.innerHeight;
          parallaxEls.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
            const rect = el.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            const delta = (center - viewH / 2);
            const translateY = -(delta * speed);
            el.style.transform = `translateY(${translateY}px)`;
          });
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }



    // Scroll progress bar
    function initScrollProgress() {
      const bar = document.querySelector('.scroll-progress');
      if (!bar) return;
      const update = () => {
        const h = document.documentElement;
        const scrollTop = h.scrollTop || document.body.scrollTop;
        const scrollHeight = h.scrollHeight - h.clientHeight;
        const p = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        bar.style.width = p + '%';
      };
      document.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    }

    function createMarqueeClones() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      document.querySelectorAll('.event-track, .image-scroller-track, .vm-track, .wm-stack').forEach((track) => {
        if (track.dataset.cloned === 'true') return;
        [...track.children].forEach((child) => {
          const clone = child.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
          track.appendChild(clone);
        });
        track.dataset.cloned = 'true';
      });
    }
