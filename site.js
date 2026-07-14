document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (menuToggle && mobileNav) {
    const setOpen = (open) => {
      mobileNav.classList.toggle('open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      document.documentElement.style.overflow = open ? 'hidden' : '';
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) mobileNav.querySelector('a')?.focus();
    };

    menuToggle.addEventListener('click', () => setOpen(!mobileNav.classList.contains('open')));
    mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobileNav.classList.contains('open')) {
        setOpen(false);
        menuToggle.focus();
      }
    });
  }

  const faqItems = [...document.querySelectorAll('.faq-item')];
  const closeItem = (item) => {
    item.classList.remove('active');
    item.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
  };
  faqItems.forEach((item) => {
    const button = item.querySelector('.faq-question');
    if (!button) return;
    button.addEventListener('click', () => {
      const shouldOpen = !item.classList.contains('active');
      faqItems.forEach(closeItem);
      if (shouldOpen) {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
  if (faqItems[0]) {
    faqItems[0].classList.add('active');
    faqItems[0].querySelector('.faq-question')?.setAttribute('aria-expanded', 'true');
  }

  if (location.hostname === 'glassrpg.com' || location.hostname.endsWith('.vercel.app')) {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    const analytics = document.createElement('script');
    analytics.src = '/_vercel/insights/script.js';
    analytics.defer = true;
    document.head.appendChild(analytics);
  }
});
