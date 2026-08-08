const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector<HTMLElement>('[data-site-header]');
const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');
const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-button]');
const mobilePanel = document.querySelector<HTMLElement>('[data-mobile-panel]');
const ambientToggle = document.querySelector<HTMLButtonElement>('[data-ambient-toggle]');

const updateScroll = () => {
  const y = window.scrollY;
  header?.classList.toggle('scrolled', y > 18);

  if (progress) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    progress.style.transform = `scaleX(${ratio})`;
  }
};

const closeMenu = () => {
  mobilePanel?.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
};

menuButton?.addEventListener('click', () => {
  const open = !mobilePanel?.classList.contains('open');
  mobilePanel?.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
});

mobilePanel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

ambientToggle?.addEventListener('click', () => {
  const active = document.body.classList.toggle('moonlight');
  ambientToggle.setAttribute('aria-pressed', String(active));
});

if (!motionQuery.matches) {
  window.addEventListener(
    'pointermove',
    (event) => {
      document.documentElement.style.setProperty('--mouse-x', `${(event.clientX / window.innerWidth) * 100}%`);
      document.documentElement.style.setProperty('--mouse-y', `${(event.clientY / window.innerHeight) * 100}%`);
    },
    { passive: true },
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
  );

  document.querySelectorAll('.reveal:not(.in-view)').forEach((element) => revealObserver.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach((element) => element.classList.add('in-view'));
}

window.addEventListener('scroll', updateScroll, { passive: true });
window.addEventListener('resize', updateScroll, { passive: true });
updateScroll();
