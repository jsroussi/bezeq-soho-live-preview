# Calendar-driven destinations

The display calendar now advances independently of weekly result uploads. On 8 November the preview shows Milan/MXP while the result snapshot remains 5 November (378 stamps, 137 units for the example representative). All approved dates and scoring inputs are preserved. Future presentation metadata stays hidden until trusted publication; changing a device clock cannot unlock destinations.

Read [CALENDAR-AUTOMATION.md](CALENDAR-AUTOMATION.md), [release.json](release.json) and the actual test evidence. The 352 existing browser checks replay their historical date; 25 independent checks cover the current calendar and refresh behavior.

Claude handoff: compare these changes with your current private application. Take the independent presentation clock, Israel timezone boundaries, separate result-freshness labels, pending-results states and form-preserving refresh where appropriate. Preserve the current real adapters, authorization, scoring, eligibility, schedule and original design work. Do not blindly replace your website. Readable changed files are in source/. The patch is relative to the prior UI source 83880b6cb1d3e65d726e577163e4d9960a1071b6; run git apply --check in an isolated private checkout first. Unchanged engine/config dependencies are intentionally absent. No secrets or employee data are packaged.

The scheduled publisher uses only the public preview repository and GitHub's built-in token. Its installation and first run must be verified separately. The initial channel hash is recorded here; scheduled channel/status updates are expected afterward.
