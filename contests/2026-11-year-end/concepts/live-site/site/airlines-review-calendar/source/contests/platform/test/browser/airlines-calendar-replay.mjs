// Existing visual/interaction regressions use an explicit historical calendar
// fixture. Calendar-live QA separately exercises the actual independent channel.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {calendarPacket} from '../../site/src/airlines/calendar-model.js';
import {parsePinnedCatalog,feedSource} from '../../scripts/airlines-calendar-publish.mjs';
const platform=fileURLToPath(new URL('../../',import.meta.url));
export const approvedCalendarCatalog=()=>parsePinnedCatalog(fs.readFileSync(path.join(process.env.AIRLINES_APPROVED_PREVIEW||'/workspace/bezeq-soho-live-preview','contests/2026-11-year-end/concepts/live-site/site/demo-data/week-9.js'),'utf8'));
export function calendarReplaySource(asOf){return feedSource(calendarPacket(approvedCalendarCatalog(),new Date(asOf+'T12:00:00Z')));}
export async function calendarReplay(context,asOf){
 if(!asOf)asOf=JSON.parse(fs.readFileSync(path.join(platform,'exports/airlines-preview/contests/2026-11-year-end/concepts/live-site/site/airlines-build.json'),'utf8')).asOf;
 const content=calendarReplaySource(asOf);
 await context.route(url=>url.pathname.endsWith('/airlines-calendar.js'),r=>r.fulfill({contentType:'text/javascript',body:content}));
 return context;
}
