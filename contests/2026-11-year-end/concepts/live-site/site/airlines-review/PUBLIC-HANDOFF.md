# BEZEQ AIRLINES — Claude comparison and integration handoff

This public-safe package describes the working synthetic website, its readable implementation, tools, design choices, verification and integration boundaries. It is not a mirror of the private application or a production deployment package.

## Start here

- Working preview: https://jsroussi.github.io/bezeq-soho-live-preview/contests/2026-11-year-end/concepts/live-site/site/
- Claude's preserved previous preview: the same URL followed by airlines-legacy.html.
- Review files: airlines-review/ under that site path.
- Read release.json for the exact source revision, runtime hashes, test results and publication status; manifest.json lists the packaged files and their checksums.
- source/ contains the whitelisted readable UI, builder and tests. source.patch overlays those changes on the private baseline. evidence/ contains public-safe browser reports, screenshots and recordings.

Only jsroussi/bezeq-soho-live-preview receives remote updates. No private Git history, server source, operational configuration, employee records, credentials, internal security findings, dependency folders or temporary helper logs belong in this package.

## Provenance and comparison baseline

The private implementation baseline is 8cabdb47399b1cc2833d3f0316372195140de4a0; remote main still matched it when checked. The real production deployment revision has NOT been established. Do not assume main, a Cloudflare ZIP, a source checkpoint and a deployment commit represent identical files.

Earlier source checkpoints were2906a58 (implementation),55c2a19 (telecommunications correction),c2f4f00 (motion) and82f9d6d (evidence). They remained in an isolated local source branch, not publicly pushed private history.

Public PR1 published the telecommunications rebuild at bb24989c3f42152166fe2dd79d066e649ef99249. PR2 enhanced motion at9b34cd060629bae30aec056ff5ba6adfa6af26bb. The latest source/deployment are recorded separately in release.json. Public review source may reference a local private source SHA; use the included overlay patch rather than assuming that commit can be fetched publicly.

## Experience and design

The Hebrew RTL campaign uses telecommunications navy #20294D, Bezeq blue #005EB8, cyan #00AEEF and white. Energy lime was excluded after owner correction. Existing approved Simpler Regular/Bold/Black fonts and approved campaign images are reused; some imagery is existing generated campaign art. No new documentary-photography licensing claim is made.

Paris opens the journey and Milan is stop two. The default replay date is visibly5November2026, with deterministic seed20261101. Approved calendar dates remain unchanged. Future stops are concealed in the new runtime's default experience; existing legacy comparison material retains its separate reveal behavior.

The public campaign includes login, connected nine-stop journey, current destination, rules/FAQ and announcements. Destination coordinates and boarding-pass month follow the revealed stop/snapshot. The mobile hero remains intentionally tall.

Six deliberately different demo experiences:
- Representative: boarding pass, actual product quantities, stamps, rank/class/eligibility, next steps and weekly history.
- Team leader: team quantities and stamps, threshold coverage, people requiring follow-up and known monthly actuals.
- Department manager: populated/empty team distinction, comparisons, actuals and explicit pending targets/eligibility.
- Division manager: active versus configured teams, separate activity units, early exceptions, sector/departments comparison and monthly actuals.
- Competition admin: selected week, freshness/readiness, six-stage synthetic Excel/matching/corrections/targets/validation/local publication.
- Superadmin: local simulated access/configuration, access review and audit.

Rankings preserve role scoping and canonical ordering, with search, sector/team/status filters,25-row pagination, detail dialogs and CSV of all filtered records. Pending ranks stay explicitly pending in cards, tables, details and exports. Null target is distinct from genuine zero progress; configured empty units remain accessible.

## Quantities, scoring and state

Actual quantities derive from dated effective synthetic rows, not stamp division or overlapping rule totals. Sales units, signed electricity agreements, forwarded/realized leads and retained units remain separately labeled. Calls, removal rates and survey points are not sales. Missing input is distinct from a recorded zero, and partial aggregates are labeled.

Baseline representative example:63Biznet +41IPC +33internet =137sales units and378canonical stamps. The existing local publication scenario replaces weekly Biznet with21, yielding95sales units and252stamps. Other products remain unchanged. Synthetic fixture product IDs were aligned with the current configuration; retired fields consume their old random draws to preserve valid seeded history.

The unchanged engine calculates stamps, eligibility, rankings and management metrics. Hypothetical admin targets do not modify approved formulas. Existing unresolved conditions remain pending rather than invented approvals or prizes.

A validated shared in-memory publication source drives quantities and canonical recalculation during the visit. Browser persistence is optional: blocked/full storage still updates the current visit, with a warning that reload restores the last saved publication or baseline. Corrupt drafts reset with an explanation while independently valid synthetic published snapshots can be retained. Draft edits invalidate validation; publication requires revision-bound validation and confirmation.

All identities are fictional. Demo login offers six public DEMO codes and password demo2026. Role/session selection and simulated access controls do not authorize production access. No production API is called.

## Technology and motion

Native DOM JavaScript/CSS, ES2022 modules and existing esbuild implement the new interface. No React, GSAP or Three.js was introduced into this runtime; legacy experiences using other libraries remain separate.

ExcelJS4.4 is an existing dependency, now a separate on-demand module for workbook actions. A same-origin, versioned bootstrap loads data before application code. Chunk-loading failure shows Hebrew recovery guidance and can retry without losing the draft. Initial compressed JavaScript is budgeted at100KiB, including demo data; release.json records the actual result.

Claude's unchanged native WAAPI animatePart/lifecycle helpers support bounded photo settling, drawn flight path, moving aircraft/arrival beacon, connected route reveals and tactile boarding-pass/progress entrances. Controls remain usable. Keyboard input, live reduced-motion changes and subtree disposal cancel motion; revisits and routine admin operations stay immediate.

Shared tokens, logical RTL layout, isolated numeric/Latin strings, native forms/dialogs, focus restoration, semantic tables and responsive density support accessibility. The mobile menu closes with Escape/outside interaction. Quantities and important numbers are not truncated.

## Verification and limitations

Playwright1.64.1 with system Chromium exercises generated application files, not merely screenshots. Temporary axe-core4.11 and system ffmpeg support QA and recordings; they are excluded from runtime.

Earlier artifacts passed281responsive/accessibility checks,14motion cases,6admin cases and12calendar cases. An earlier expanded repository suite passed301tests, with1managed-environment file-polling skip. Historical passes do not automatically cover newer revisions. The refinement adds raw-quantity/model tests and18browser cases for quantities, scope, CSV/pagination, storage failure, lazy Excel retry, images, mobile controls and worst-case layouts. Latest reports/hashes in release.json are authoritative.

Seven dashboard/public axe scans previously reported zero violations. Automated coverage is not full WCAG certification; final review must inspect incomplete categories, route/dialog/admin states, keyboard interaction, long data and enlarged text. Laboratory timings are not real-device or field performance.

The managed environment previously blocked jsroussi.github.io with ERR_TUNNEL_CONNECTION_FAILED. GitHub Pages builds succeeded, but no successful remote role navigation or published screenshot is implied. See the latest live-browser report for the fresh attempt.

## Rebuild and adapt in the PRIVATE checkout

Unchanged engine/site-data code, contest configuration, native helpers, fonts/assets and package lockfile remain dependencies in the authorized private repository. This snapshot is not independently buildable without them.

1. Create a separate branch/worktree at the documented private baseline, or reconcile differences against the actual current target.
2. Inspect manifest and source.patch, then git apply --check and git apply the patch in that separate checkout.
3. Use Node22+ and the private repository's existing package/lockfile; install its normal dependencies there.
4. Clone the public preview separately for approved assets. From contests/platform run:
   node scripts/build-airlines-preview.mjs exports/airlines-preview /absolute/path/to/public-preview-checkout
5. Run the included preview/admin/calendar/motion/refinement and model checks. Use system Chromium; ffmpeg is needed only for recording motion.
6. Review the exact generated artifact. A locally created overlay commit has different provenance metadata; canonical fixture values and compiled UI should otherwise reproduce consistently.

Port useful UI into a separate real-app branch. Replace demo login, fixtures and local state with approved real adapters; preserve real authentication, authorization, scoring, eligibility and publication controls. Do not import the static demo's access model into production.

## Ready-to-paste Claude prompt

Compare my private current BEZEQ SOHO application with the public BEZEQ AIRLINES airlines-review package in jsroussi/bezeq-soho-live-preview. Read this handoff, PUBLIC-SKILLS.md, release.json, manifest.json and source.patch first. Work on a separate branch and preserve existing work. Baseline8cabdb47399b1cc2833d3f0316372195140de4a0 is source provenance, not proof of the real production deployment. Compare equivalent dates, data and all six roles. Adapt useful quantity displays, design hierarchy, Hebrew RTL, responsive behavior, admin clarity and native motion while preserving the canonical engine/configuration, real authentication, server authorization and publication safeguards. Replace all demo adapters appropriately. Keep private history, server code, employee data, credentials and internal findings out of public publication. Rerun tests, inspect mobile/desktop and motion captures, measure loading, verify the reachable deployed URL, and report differences, decisions, changed files and remaining gaps. Do not deploy production as part of this comparison.
