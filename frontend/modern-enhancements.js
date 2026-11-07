/* MediPredict premium motion layer — additive and dependency-free. */
document.addEventListener('DOMContentLoaded', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const reveal = document.querySelectorAll('.mp-reveal, .mp-stagger');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    reveal.forEach(el => observer.observe(el));
  } else reveal.forEach(el => el.classList.add('is-visible'));

  // Gentle pointer parallax on the telemetry card.
  const card = document.querySelector('.mp-telemetry');
  if (card && window.matchMedia('(pointer:fine)').matches) {
    document.addEventListener('mousemove', e => {
      const x = (e.clientX / innerWidth - .5) * 2;
      const y = (e.clientY / innerHeight - .5) * 2;
      card.style.transform = `translate(${x * 5}px, ${y * 5}px)`;
    }, { passive: true });
  }
});
