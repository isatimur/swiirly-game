# Firestore Leaderboard + Ratings + Email Capture — Design Spec

Date: 2026-05-19
Status: Approved, ready for implementation plan
Touches: `play/src/scenes/Menu.js`, `play/src/scenes/LevelComplete.js`, `play/src/scenes/Boot.js`, `play/src/main.js`, `play/index.html`, `package.json`, plus new files under `play/src/backend/` and Firebase config at the repo root

## Problem

The game persists rank + run-count state in `localStorage`, so a player's
record is invisible to anyone else and the existing 👍/👎 prompt currently
writes only to `localStorage` ("stays local" subtitle). There is no shared
leaderboard, no way for the developer to see real ratings, and no mechanism
to contact players who want to hear about updates.

This spec adds three Firestore-backed subsystems behind anonymous Firebase
Auth: a per-run leaderboard, a real rating sink, and an opt-in private email
field that's displayed obfuscated on the public board. SESSION-NOTES.md
pending #5 ("Daily Swiirl") previously planned Vercel KV for a leaderboard
— this spec replaces that decision. The Firestore schema is forward-shaped
so the Daily Swiirl feature can reuse it later.

## Goals

- Public leaderboard of completed runs (top scorers), visible from the Menu
- Real ratings sink (existing 👍/👎 flows to Firestore alongside localStorage)
- Optional email capture, stored privately, obfuscated on the public board
- Anonymous Firebase Auth — no sign-in friction for players
- Anti-abuse baseline via Firestore security rules (no Cloud Functions yet)
- Forward-compatible with the Daily Swiirl feature

## Non-goals

- Daily Swiirl feature itself (pending #5) — schema is compatible but not implemented
- Cloud Functions (score validation, daily aggregation, automated GDPR deletion)
- Friends / following / multi-device account merge
- Email OTP verification
- Profanity filter on names (moderate via Firebase Console for v1)
- Adding L6 score to the leaderboard total — submission moment is L5
- Real GDPR deletion flow — manual via Firebase Console; players email the dev

## Architecture summary

Three layers:

1. **Backend modules** (`play/src/backend/`) — `firebase.js` (init + anon
   auth + UID caching), `leaderboard.js` (run submit/query, obfuscation),
   `ratings.js` (rating submit), `queue.js` (localStorage retry queue).
2. **Firestore rules + project config** (`firestore.rules`, `firebase.json`,
   `.firebaserc`) — security rules enforce data shape, identity, rate-limit,
   and best-run-only updates.
3. **UI surfaces** — L5 LevelComplete submission card, new Menu "LEADERBOARD"
   button + `Leaderboard` Phaser scene, existing post-3-runs Menu prompt
   re-pointed to Firestore.

Firebase v10 modular SDK loads via ESM CDN imports on first use (lazy) — not
during Boot — so players who never touch the board don't pay the SDK
cost. Cached after first load by the browser.

## Data model

### `runs/{uid}` — public read

```js
{
  name: "string (1..20)",
  emailDisplay: "string|null",  // "t****@gmail.com" or null if no email
  total: 142800,                // number 0..500000
  durationMs: 521000,           // run wall-clock, ms
  characterId: "swiirl",        // one of: swiirl, crimson, mint, ocean, honey
  ranks: { L1: "S", L2: "A", L3: "B", L4: "S", L5: "A" },
  runType: "standard",          // "standard" now; "daily" reserved for pending #5
  createdAt: <serverTimestamp>,
  updatedAt: <serverTimestamp>,
  appVersion: "11"              // matches Boot.js ASSET_VERSION
}
```

One row per UID. Best-run-only — security rules reject updates whose `total`
is not strictly greater than the existing row's `total`.

### `private_emails/{uid}` — admin-read-only

```js
{
  emailRaw: "alice@example.com",
  optedInAt: <serverTimestamp>,
  source: "submit-run"          // future: "menu-prompt", "newsletter-subscribe"
}
```

Only written when the player provides an email at submission. Stricter rule:
no client reads at all.

### `ratings/{uid}` — admin-read-only

```js
{
  kind: "up" | "down",
  comment: "string|null (≤200)",
  appVersion: "11",
  createdAt: <serverTimestamp>
}
```

One row per UID, overwritable.

### Firestore indexes

- `runs` collection: composite index on `(runType ASC, total DESC)` for the
  primary leaderboard query.
- All other queries are single-field, no manual index needed.

## Security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function fitsRunSchema() {
      return request.resource.data.keys().hasOnly([
        'name','emailDisplay','total','durationMs','characterId',
        'ranks','runType','createdAt','updatedAt','appVersion'
      ])
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 1
        && request.resource.data.name.size() <= 20
        && (request.resource.data.emailDisplay == null
            || (request.resource.data.emailDisplay is string
                && request.resource.data.emailDisplay.size() <= 64))
        && request.resource.data.total is number
        && request.resource.data.total >= 0
        && request.resource.data.total <= 500000
        && request.resource.data.durationMs is number
        && request.resource.data.durationMs > 0
        && request.resource.data.durationMs <= 7200000   // 2h ceiling
        && request.resource.data.characterId in [
             'swiirl','crimson','mint','ocean','honey'
           ]
        && request.resource.data.runType in ['standard','daily']
        && request.resource.data.ranks is map;
    }

    match /runs/{uid} {
      allow read: if true;
      allow create: if
        request.auth != null
        && request.auth.uid == uid
        && fitsRunSchema();
      allow update: if
        request.auth != null
        && request.auth.uid == uid
        && fitsRunSchema()
        && request.resource.data.total > resource.data.total
        && request.time > resource.data.updatedAt + duration.value(30, 's');
      allow delete: if false;
    }

    match /private_emails/{uid} {
      allow read: if false;
      allow create, update: if
        request.auth != null
        && request.auth.uid == uid
        && request.resource.data.emailRaw is string
        && request.resource.data.emailRaw.size() >= 5
        && request.resource.data.emailRaw.size() <= 254
        && request.resource.data.emailRaw.matches('.*@.*\\..*');
      allow delete: if false;
    }

    match /ratings/{uid} {
      allow read: if false;
      allow create, update: if
        request.auth != null
        && request.auth.uid == uid
        && request.resource.data.kind in ['up','down']
        && (!('comment' in request.resource.data)
            || request.resource.data.comment == null
            || (request.resource.data.comment is string
                && request.resource.data.comment.size() <= 200));
      allow delete: if false;
    }
  }
}
```

## UX flows

### Surface A — L5 LevelComplete submission card

Trigger: `LevelComplete.create()` when `payload.levelNum === 5`. After the
existing celebration tween settles (delay ~1800 ms), slide in a card from
the bottom:

```
RUN COMPLETE — ALL 5 LEVELS

  TOTAL SCORE   142,800
  TOTAL TIME      8:41
  RANK             S

  ▸ Add to the world board?

  NAME   [ Swiirl#7842 ____ ]   (displayed publicly)
  EMAIL  [ optional ______ ]    (private — shown as t****@gmail.com)

  [ SUBMIT ]    [ SKIP ]
```

- Default name: `Swiirl#XXXX`, where `XXXX` = first 4 hex chars of the UID
  hash — deterministic per device.
- Submit handler calls `submitRun({ ... })`. On success: the card flips to
  a thank-you that reads `your rank: #14 out of 247` (fetched live).
- Skip handler: dismiss the card; nothing is written.
- If rating not yet given (`localStorage["swiirl.feedbackGiven"] !== "1"`),
  the thank-you state shows the existing 👍/👎 buttons. On tap, write
  rating to `ratings/{uid}` AND set the localStorage flag.
- After the card dismisses (submit-and-thank or skip), the existing
  "press SPACE to continue" → L6 transition fires as today.

### Surface B — Menu "LEADERBOARD" button

Add a button to the existing Menu surface (slot near the ranks row). Click
→ `scene.start("Leaderboard")`. The new scene fetches `topRuns({ limit: 20,
runType: "standard" })`, renders a scrollable list:

```
LEADERBOARD — TOP RUNS

#   NAME            SCORE      TIME    CHAR     EMAIL
1   HelipadKing     187,400    8:14    Honey    h****@swiirl.co
2   TBoss           178,200    8:41    Crimson  t****@gmail.com
3   YOU             162,800    9:02    Ocean    a****@yahoo.com    ←
...
20  GhostHunter     108,400   11:22    Mint     —

(ESC / B to return)
```

Player's own row is highlighted (visible regardless of position via a
`myRow()` call). Empty state ("no runs yet — be the first") if the
collection is empty.

### Surface C — existing Menu "Enjoying Swiirl?" prompt

UI unchanged. `_submitFeedback(kind)` is updated:

1. Continue to set `localStorage["swiirl.feedback"]` + `swiirl.feedbackGiven`.
2. Also call `ratings.submitRating({ kind })`.

The prompt's gating logic (runs >= 3 && !feedbackGiven) is unchanged. If the
L5 submission card already collected a rating, `feedbackGiven` is "1" and
this prompt is suppressed naturally.

### Failure handling — all surfaces

`submitRun`, `submitRating`, and `private_emails` writes each:

1. Attempt one direct write.
2. On failure, retry once after 800 ms.
3. If both fail, push the payload onto `localStorage["swiirl.pendingSubmissions"]`
   (a JSON array of `{ kind, payload }`).
4. The queue is drained on the next Menu boot (`firebase.js` calls
   `queue.drain()` after auth completes).

The player never sees an error toast — submission is fire-and-trust. Logged
failures are surfaced only in DevTools console.

## File structure

### New files

```
play/src/backend/
  firebase.js     // ~80 lines — init + signInAnonymously + getUid() with caching
  leaderboard.js  // ~120 lines — submitRun, topRuns, myRow, obfuscateEmail
  ratings.js      // ~60 lines  — submitRating
  queue.js        // ~50 lines  — localStorage retry queue

play/src/scenes/
  Leaderboard.js  // ~150 lines — Phaser scene for Surface B

firestore.rules   // see Security rules section above
firebase.json     // CLI config — emulators (Firestore, Auth) + rules target
.firebaserc       // project alias { "default": "<project-id>" } — set during manual setup
```

### Modified files

| File | Change |
|---|---|
| `play/src/main.js` | register `LeaderboardScene` |
| `play/src/scenes/Menu.js` | add LEADERBOARD button; reroute `_submitFeedback` through `ratings.js` while keeping localStorage write |
| `play/src/scenes/LevelComplete.js` | gate Surface A card on `payload.levelNum === 5`; show after celebration; defer next-level transition until card dismissed |
| `play/src/scenes/Boot.js` | bump `ASSET_VERSION` `"11"` → `"12"` (HTML preconnect line invalidates cached index) |
| `play/index.html` | add `<link rel="preconnect" href="https://firestore.googleapis.com">` and `<link rel="preconnect" href="https://identitytoolkit.googleapis.com">` |
| `package.json` | add `firebase-tools` to `devDependencies`; new scripts `deploy-rules` and `emulators` |

### Firebase project setup (manual, one-time)

1. Create Firebase project (Spark / free tier).
2. Web app → copy config object (`apiKey`, `authDomain`, `projectId`, `appId`,
   `storageBucket`, `messagingSenderId`) into `play/src/backend/firebase.js`
   as a `FIREBASE_CONFIG` constant. The Web API key is safe to ship publicly
   (security comes from rules + auth, not the key).
3. Enable **Anonymous** sign-in (Authentication → Sign-in method).
4. Create Firestore database in **production mode** (rules from this spec).
5. Add composite index: collection `runs`, fields `(runType ASC, total DESC)`.

The plan will include this checklist as the first task.

## Module APIs

### `firebase.js`

```js
export async function getFirebase() { ... }           // returns { app, db, auth, uid }
export async function getUid() { ... }                // returns string
```

Returns the same cached `{ app, db, auth, uid }` object after the first call
within a session.

### `leaderboard.js`

```js
export async function submitRun({
  name, email, total, durationMs, characterId, ranks
}): Promise<{ ok: boolean, rank?: number, totalRuns?: number }>;

export async function topRuns({
  limit = 20, runType = "standard"
}): Promise<Array<RunRow>>;

export async function myRow(): Promise<RunRow | null>;

export function obfuscateEmail(raw: string): string;
//   "alice@gmail.com" → "a****@gmail.com"
//   "ab@x.io"         → "a*@x.io"
```

### `ratings.js`

```js
export async function submitRating({
  kind: "up" | "down",
  comment?: string
}): Promise<{ ok: boolean }>;
```

### `queue.js`

```js
export function enqueue(kind, payload) { ... }
export async function drain() { ... }   // called from firebase.js post-auth
```

## Build / run / deploy

- `npm run dev` and `npm start` continue to work unchanged (Firestore writes
  hit the configured project; reads work for public collections).
- `npm run emulators` (NEW) starts Firestore + Auth emulators locally. The
  `firebase.js` module detects `localhost` + a `?emulator=1` URL param and
  routes to emulator hosts. Default behavior (no `?emulator=1`) hits prod.
- `npm run deploy-rules` (NEW) deploys `firestore.rules` via firebase-tools.
- Production deploy is still `npx vercel --prod`. The Firestore project is
  external to Vercel.

## Testing & verification

No test runner exists. Verification is manual:

1. **Emulator path**: start emulators, run `npm run dev`, open
   `/play/?emulator=1`. Submit a run via L5 cheat. Confirm a doc appears in
   the Firestore emulator UI (`http://localhost:4000`). Re-submit with a
   LOWER score — confirm the rule blocks it. Re-submit with a HIGHER score
   — confirm it overwrites.
2. **Production path**: a single end-to-end real-prod submission after
   deploying rules.
3. **Failure mode**: in DevTools Network tab, block requests to
   `*.googleapis.com`. Submit a run. Confirm the payload lands in
   `localStorage["swiirl.pendingSubmissions"]`. Unblock the network, reload,
   confirm the queue drains and the doc appears.
4. **Leaderboard scene**: open Menu → LEADERBOARD. Confirm top runs render.
   Highlight on own row works. ESC returns to Menu.
5. **Rating gating**: with `swiirl.feedbackGiven` cleared, submit via L5
   surface. Confirm Menu prompt doesn't fire on next Menu visit. With the
   flag cleared and L5 submission skipped, confirm Menu prompt still fires
   after 3 runs and writes the rating to Firestore.

## Privacy posture

- Inline subtitles on the email field tell the player exactly what happens.
- The privacy line below the submit card:
  *"Your email is stored privately and used only by the developer.*
  *To delete your row, email swiirl.claude@gmail.com."*
- The `private_emails` collection is **never** readable by clients —
  Firestore rules block it. Only Firebase Console (admin auth) can read.
- The public `runs/{uid}` document carries only `emailDisplay` (the
  already-obfuscated string), so even a malicious client downloading the
  whole collection cannot enumerate raw emails.
- No tracking cookies, no analytics, no third-party SDKs introduced.

## Risks during implementation

- **First Firestore deploy is interactive** — `firebase login` requires a
  browser flow the implementer cannot drive. The plan will include a
  user-action step for this.
- **`obfuscateEmail` edge cases**: very short local-parts (`a@b.io`),
  multi-`@` strings (shouldn't happen post-validation), Unicode local-parts.
  The function takes a defensive approach: if the input doesn't match
  `/^.+@.+\..+$/`, return `"***"` instead of throwing.
- **Anonymous auth UID rotation**: if a player clears site data, they get a
  new UID and their row is orphaned (no way to recover). This is expected
  behavior — anon UID is device-bound, not portable. Documented in spec but
  not mitigated.
- **Quota**: Spark tier gives ~50k reads/day, 20k writes/day, 1 GB. The
  leaderboard scene reads 20 docs per open. A meaningful spike would need
  the Blaze (pay-as-you-go) tier. Likely fine for v1.
- **Anti-cheat is shallow**: rules-only validation can't detect e.g. a
  legitimate-looking but client-fabricated score. A Cloud Function that
  recomputes plausibility (min insights for this score, characterId
  matches one that exists, etc.) is the obvious v2 step.

## Open follow-ups (deferred)

- Cloud Function `validateRunSubmission` that rejects implausible scores.
- Self-service "delete me" mechanism (currently manual via Console).
- Daily Swiirl feature — see SESSION-NOTES pending #5; this spec leaves
  `runType` + future `date` field as the seam for it.
- Per-level leaderboards (we chose per-run only here; per-level is a
  future toggle on the same data if we capture per-level rows separately).
