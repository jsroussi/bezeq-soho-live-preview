# Public preview calendar automation

The publisher is restricted to `jsroussi/bezeq-soho-live-preview`, branch `gh-pages`, legacy Pages source `/`. It updates only `contests/2026-11-year-end/concepts/live-site/site/airlines-calendar.js`, that site's `airlines-calendar-status.json`, and missing, already revealed WebP photos below its `airlines-assets/`. It never changes results, HTML, application bundles or original source assets.

The approved display catalog comes from the public `demo-data/week-9.js` JSON assignment at immutable commit `e1c467fed2279429056badba987a13140a4caa21`, tree `a4139fd6fbfc7f5bd5ffe77213545e1d89109e72`. The publisher verifies that tree and blob hashes, parses JSON without executing JavaScript, checks synthetic provenance and all nine calendar dates, and selects only display fields. English city/airport labels match the existing preview builder. The reviewed Vegas and Cancún landmark names match its existing overrides. Employee/result/rule/prize fields are excluded. Future metadata and photos are omitted from the published packet.

Publication uses the trusted runner clock in `Asia/Jerusalem`. Packets are deterministic within an Israeli calendar day. The visual calendar is independent of the frozen result date. October 31 permits a prelaunch packet; January 1 permits the final `after` packet. All other dates outside the 2026 campaign bounds return without API calls, including later years.

Only actual automation creates `airlines-calendar-status.json`; the initial site builder must leave it absent. This public audit record contains schema/synthetic/time-zone identity, publication date, pinned source commit, `github-actions-calendar` origin, the real publication timestamp and optional Actions run ID. A missing record causes a status-only commit even when the initial calendar feed is current, exercising the actual token's write and Pages-build permissions. Every later feed/image publication updates status atomically in the same Git tree. A same-day no-op preserves the original timestamp and run ID byte for byte. Invalid or unexpected existing status fails safely before mutation. Status contains no results or future destination fields, and does not itself prove that a queued Pages build finished.

For the public repository, copy the publisher to `automation/airlines-calendar/publish.mjs`, changing only its model import to `./model.mjs`; copy the exact reviewed calendar model bytes to that path. Install the supplied workflow as `.github/workflows/airlines-calendar.yml` on default branch `main`. No npm installation or private data/secrets are required: the workflow uses its built-in GitHub token with `contents: write` and `pages: write`. The workflow runs only by schedule or manual dispatch, guards repository and branch identity, uses pinned checkout and sparse checkout, and serializes runs without cancelling active publication.

Scheduled runs occur every 15 minutes in November/December and late October 31 UTC. GitHub schedules are best effort: they may be delayed or skipped and do not guarantee an exact midnight transition. The late December 31 UTC runs can publish the January 1 Israeli finale. A manual dispatch can recover a delayed publication.

Git writes use `base_tree`, preserve every unrelated blob and mode, verify the entire resulting tree, and compare branch head before a non-force update. Concurrent head changes trigger a bounded retry. Earlier calendar dates and changed preexisting photos are refused. GitHub failures remain visible as failed runs; tokens, source catalogs and source response bodies are not logged.

An Actions-token commit does not by itself trigger legacy Pages. Every successful/no-op run checks the latest Pages build and explicitly requests a build unless that same head is already built, queued or building. A failed request can therefore recover on the next run without another commit. A queued build is not proof of deployment: inspect the build status and served preview after manual verification.

Run the isolated mocked verification with:

```sh
node --test contests/platform/test/airlines-calendar-model.test.js contests/platform/test/airlines-calendar-publish.test.js
```

These tests use only synthetic in-memory fixtures. They cover Israeli midnight, frozen result bytes, no-op behavior, missing/corrupt input, path/mode preservation, rollback refusal, concurrent branch advances, API failures, Pages build recovery, repository identity, campaign year bounds, first-run audit publication, unchanged audit preservation, next-day atomic updates and missing-image repair.

The initial builder also checks catalog and revealed photo Git blob hashes against `scripts/airlines-calendar-source.json`, captured from the same immutable public tree. A differing local checkout fails before the preview is built. Only the separate calendar channel is mutable after release; UI hashes describe the reviewed build, and the channel hash describes its initial publication.

The existing browser suites explicitly replay the historical 5 November display fixture; the independent calendar suite tests the actual Milan build, Israeli midnight, all six roles, foreground recovery, form preservation and trusted-channel reveal boundaries. These are separate coverage claims.
