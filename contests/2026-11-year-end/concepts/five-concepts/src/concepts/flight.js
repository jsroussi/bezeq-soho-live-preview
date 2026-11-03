// The week change every concept shares: the globe takes over (all of the stage, or only a window of it), the camera
// flies from last week's city to this week's along the route, the colours morph, then the globe gives the stage back.
import gsap from 'gsap';
import { applyTokens, tokens } from '../theme.js';
import { reduced } from '../motion.js';

const sleep = (s) => new Promise((r) => gsap.delayedCall(s, r));

// The canvas clipped to an element's box on screen.
export const clipTo = (el) => {
  const r = el.getBoundingClientRect(), px = (v) => `${Math.max(0, Math.round(v))}px`;
  return `inset(${px(r.top)} ${px(innerWidth - r.right)} ${px(innerHeight - r.bottom)} ${px(r.left)})`;
};

// clip: a CSS clip-path for the canvas (the stage, or a window in it); centre: [x, y] in px to centre the globe on.
export async function overlayFlight(ctx, from, to, { clip, centre = null, frame = 'near', duration = 2.2, during } = {}) {
  const { globe, weeks } = ctx, gl = ctx.canvas;
  if (reduced()) { applyTokens(tokens(to)); during?.(); return; }
  globe.setLook('photo'); globe.setGrade(from); globe.setRoute(weeks, Math.max(from.index, to.index), tokens(to)['--w-accent'], 'photo');
  globe.offset = centre ? [-(centre[0] - innerWidth / 2), -(centre[1] - innerHeight / 2)] : [0, 0];
  globe.frameNow(from, frame);
  const leg = to.index === from.index + 1 ? from.index : -1; if (leg >= 0) globe.legProgress(leg, 0);
  gl.style.clipPath = clip ?? clipTo(ctx.root.querySelector('.stage') ?? ctx.root); gl.classList.add('fly'); gl.style.opacity = 0; globe.start();
  await gsap.to(gl, { opacity: 1, duration: 0.35, ease: 'power1.out' });
  applyTokens(tokens(to), duration * 0.8); globe.setGrade(to, false, duration);
  during?.();
  await globe.flyTo(to, { frame, duration, rise: frame === 'near' ? 1.5 : 1.1, leg });
  await gsap.to(gl, { opacity: 0, duration: 0.4, ease: 'power1.in' });
  gl.classList.remove('fly'); gl.style.clipPath = ''; gl.style.opacity = ''; globe.offset = [0, 0]; globe.stop();
}
export { sleep };
