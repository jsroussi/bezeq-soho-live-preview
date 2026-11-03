// Simpler, Bezeq's typeface, inlined: a font file next to the page does not load over file:// in every browser.
import regular from '../fonts/Simpler-Regular.otf';
import bold from '../fonts/Simpler-Bold.otf';
import black from '../fonts/Simpler-Black.otf';

export default [[regular, 400], [bold, 700], [black, 900]]
  .map(([src, w]) => `@font-face{font-family:Simpler;font-weight:${w};font-style:normal;font-display:block;src:url("${src}") format("opentype")}`).join('\n');
