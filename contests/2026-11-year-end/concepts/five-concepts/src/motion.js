// Each week arrives in its own way. One function per motion style; all of them move transform and opacity only,
// and all of them become an instant cut under reduced motion.
import gsap from 'gsap';

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.still === '1';

const STYLES = {
  // Paris at blue hour: slow, a little float.
  drift: (els) => gsap.from(els, { opacity: 0, y: 22, duration: 1.4, ease: 'sine.out', stagger: 0.14 }),
  // Milan: a runway, crisp slides from the side, no float.
  runway: (els) => gsap.from(els, { opacity: 0, x: -64, duration: 0.55, ease: 'expo.out', stagger: 0.08 }),
  // Marrakech at noon: a shadow line sweeps across and leaves the element behind it.
  sweep: (els) => gsap.from(els, { clipPath: 'inset(0 0 0 100%)', duration: 0.9, ease: 'power3.inOut', stagger: 0.1 }),
  // Las Vegas: lights coming on, one after another, a little uneven.
  flicker: (els) => gsap.fromTo(els, { opacity: 0 }, { keyframes: { opacity: [0, 1, 0.25, 1, 0.7, 1] }, duration: 0.6, ease: 'none', stagger: 0.07 }),
  // Cancún: a swell, each element landing a beat after the last.
  wave: (els) => gsap.from(els, { opacity: 0, y: 34, duration: 0.9, ease: 'back.out(1.7)', stagger: { each: 0.09, ease: 'sine.inOut' } }),
  // Tokyo: precise, in steps, like a grid filling in.
  step: (els) => gsap.from(els, { opacity: 0, y: 14, duration: 0.5, ease: 'steps(5)', stagger: 0.06 }),
  // Athens: vertical, the Acropolis rising over the city.
  rise: (els) => gsap.from(els, { opacity: 0, y: 64, duration: 0.9, ease: 'power4.out', stagger: 0.09 }),
  // New Delhi in the evening: soft, opening like a flower.
  bloom: (els) => gsap.from(els, { opacity: 0, scale: 0.94, duration: 1.1, ease: 'power2.out', stagger: 0.12, transformOrigin: '50% 60%' }),
  // Jerusalem at golden hour: slow and warm, from below.
  golden: (els) => gsap.from(els, { opacity: 0, y: 16, duration: 1.3, ease: 'power2.out', stagger: 0.13 }),
};

export function arrive(style, els) {
  const list = [...els].filter(Boolean);
  if (!list.length) return null;
  gsap.killTweensOf(list);
  gsap.set(list, { clearProps: 'opacity,transform,clipPath' });
  if (reduced()) return null;
  return (STYLES[style] ?? STYLES.drift)(list);
}
