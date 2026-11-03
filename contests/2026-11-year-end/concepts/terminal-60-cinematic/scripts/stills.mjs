// Renders a list of frames for review (or QA) into one folder: node scripts/stills.mjs Main 0.5 out 10,200,...
import { execFileSync } from 'node:child_process';
const [comp, scale, out, list] = process.argv.slice(2);
for (const f of list.split(',')) execFileSync('node', ['scripts/capture.mjs', '--comp', comp, '--from', f, '--to', String(Number(f) + 1), '--scale', scale, '--workers', '1', '--out', out], { stdio: 'inherit' });
