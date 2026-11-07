# Design system

Telecommunications navy #20294D, Bezeq blue #005EB8, cyan #00AEEF, white and restrained neutral surfaces. No energy lime. Approved Simpler Regular/Bold/Black fonts. Semantic tokens in styles.css cover foreground, muted text, line, surface, radius and shadow.

Shared native components: campaign header/navigation, destination itinerary, announcement rows, boarding pass, metric/quantity groups, progress and eligibility states, semantic responsive data tables, filtered/paginated ranking, detail dialogs, labeled forms, confirmation dialogs, upload/matching/validation stages, status/audit disclosures. Stamps remain the primary score; sales and other activity units remain explicitly distinct.

Logical RTL spacing and LTR bdi numbers; strong heading hierarchy; touch targets at least 44px for primary controls. Multi-column desktop layouts adapt at 1200/900/600px. Tables become explicit seven-cell mobile grids. 320–1920px viewport tests, enlarged-text and long-data cases cover reflow.

Native WAAPI/transforms/opacity deliver bounded image settling, flight-path/arrival, boarding-pass and progress feedback. Lifecycle cleanup, keyboard cancellation and live prefers-reduced-motion support prevent delayed routine work. Administrative operational routes remain immediate. See readable styles.css, admin.css and motion.js for exact timing and token implementation.
