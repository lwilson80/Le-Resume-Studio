# Browser compatibility review

Review date: 2026-10-12. Intended targets: current desktop Safari, Chrome, Edge and Firefox, plus current Safari/Chrome on iPhone/iPad and Chrome/Firefox on Android. The app requires JavaScript modules and native HTML dialogs. This is a compatibility implementation review, not a certification of every browser version or device.

## Changes

- Both pages use a device-width viewport with zoom enabled and `viewport-fit=cover`. Responsive rules account for safe-area insets, portrait and landscape layouts, large text, wrapped controls, and narrow screens.
- Form text stays at least 16 CSS pixels at the default settings to reduce unintended input zoom on phones while retaining user enlargement. Touch targets and existing keyboard/screen-reader behavior are preserved.
- Native dialogs can use visual-viewport height and offset when the on-screen keyboard changes the visible space. Pinch zoom removes these overrides so the browser continues to manage zoom. CSS viewport fallbacks remain available.
- Safari-incompatible literal regex lookbehind was removed from application writing code, preserving sentence punctuation. Plain resume data has a JSON clone fallback when `structuredClone` is missing; the app no longer needs `Array.at` or `Object.hasOwn`.
- Word and PDF libraries load only when that export format is requested. Plain text and the initial tailoring UI need neither library. Concurrent library requests share one load; a failed load can be retried and reports the plain-text alternative. Dependencies remain vendored on the private Site.
- Folder selection is detected rather than assumed. Ordinary download links remain available when no native folder picker exists. File sharing is offered only if `File`, `navigator.share`, and `navigator.canShare` accept the exact prepared file. Sharing begins directly on a user click; cancellation and rejection do not discard the download. A share promise is never treated as confirmation that a file was saved.
- Automatic clipboard copying runs directly from the click. If the API is absent or denied, a named, focus-managed dialog provides read-only selectable document text and a Select all action.
- Blocked or full browser storage does not prevent tailoring, current-tab history, or downloads. A persistent notice identifies that edits must be downloaded before the tab closes.
- Help and the standalone download page explain phone/tablet saving and previews. JavaScript-disabled browsers receive an enable-JavaScript notice.

## Behavior by capability

| Capability | App behavior |
| --- | --- |
| Native folder picker available outside an embedded frame | Opens the picker on Save file; confirms only after the write stream closes. |
| No folder picker | Uses the browser's normal download link and filename. |
| File sharing supported for this format | Offers Share file; the device may provide Save to Files or another destination. |
| Share API absent, format unsupported, or embedded frame | Hides Share file; keeps ordinary downloads and the browser-page handoff. |
| Clipboard available and permitted | Copies the selected resume or cover letter. |
| Clipboard absent or denied | Provides selectable text in the copy dialog. |
| Browser storage unavailable | Keeps the current session functional and displays a persistent notice. |
| VisualViewport unavailable | Uses CSS viewport sizing. |

## Verification

`npm test`: 124 tests passed, including 7 fresh-browser master and onboarding checks. The 14 browser-capability simulations cover clone fallbacks, writing punctuation, export loading/deduplication/retry, actual Word/PDF bytes without dynamic lookbehind, file-sharing support and failure states, keyboard viewport updates, clipboard success/fallback, and unavailable storage. Existing tests cover all six resume/cover-letter export combinations, payload handoff, native save completion/cancellation, ATS keyword evidence, and 12 accessibility checks.

No managed browser-control skill was available in this environment. Actual browser rendering, platform share sheets, Safari downloads, touch interaction, screen readers, and on-device keyboard/orientation behavior remain unverified. Before claiming complete browser compatibility, test these journeys on real Safari/macOS, Safari/iOS, Chrome/Android and desktop Chrome/Firefox/Edge: tailor, edit each document, switch tabs, copy, download all formats, share supported files, cancel saves, reopen history, rotate the device, zoom, and use the on-screen keyboard. Include storage-restricted and embedded contexts.

## Primary references

- https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare
- https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- https://webkit.org/blog/13966/webkit-features-in-safari-16-4/


## Master resume upload — version 14

Master resume permits file upload only: DOCX, text-based PDF, UTF-8 TXT or RTF up to 10 MB (PDF: 30 pages). Any readable upload saves automatically, without required sections or applicant fields. Extracted text is read-only; correct the original file and upload again. Clear Master Resume removes the stored source, extracted text, file selection and current output, cancels pending imports, and stays blank after reopening. Saved versions are cleared separately. Errors preserve the previous source. Real-device and screen-reader upload checks remain pending.


## Formatting and privacy — version 15

Imports retain each final accomplishment within its job and preserve uploaded role/company/year heading order across preview, Word, PDF and TXT. Privacy and password provides opt-in AES-256-GCM protection of browser-local saved data, with a passphrase required after reopening. Without it, a shared browser profile can access saved records. Download links carry only temporary session-bound identifiers, not documents. Same-origin content restrictions and no-referrer metadata are present on both pages. Real browser, device and screen-reader verification remains pending.

## Upload-only source and formatting — version 16

Word and PDF uploads retain detected typography, supported section order and role/company/year headings. PDF uses compatible embedded font families. Complex tables, graphics, columns and exact original pagination are not reproduced. TXT and RTF use a single-column Arial 11-point template with 0.75-inch margins, consistent headings and action bullets. See [MIT resume checklist](https://capd.mit.edu/resources/resume-checklist/). The release passed 124 automated tests; real browser and ATS certification are not claimed.

## Unique upload filenames — version 20

Each successful master resume upload requires a unique filename within this browser master workspace. Comparisons normalize Unicode, trim surrounding whitespace and ignore capitalization. A duplicate is rejected before extraction and leaves the existing master intact. Rename revised files before uploading. Failed or canceled imports do not reserve names. Clear Master Resume deletes the master and its filename history, allowing a fresh upload. The history stays alongside the master in existing browser storage or the encrypted vault; no filename data is shared across users. Applicant names do not need to change.

The release passes 132 automated checks, including duplicate rejection, renamed replacements, failed retry, reopening and clearing filename history. Native Safari/mobile picker interactions remain unverified.

## Flexible master resume imports

Uploads need no name, professional summary, skills, specific section headings, complete job details or education fields. Short readable text is accepted. Unlabeled text is retained as summary content when structure is absent. Tailoring and downloads allow empty fields; cover letters omit role evidence when no accomplishments are available. Review extraction and output because missing facts cannot be inferred reliably. Supported file formats, readable-text and resource protections and unique filenames remain in effect.

Clear Master Resume empties the uploaded resume text, job description, extra keywords and copy-text boxes immediately on click, before awaiting the browser storage write. Saved application versions remain separate.


## Master resume review and deletion — version 20

The master dialog restores version 1 section grouping: contact details, professional summary, core competencies, expandable experience, technical skills and education. Upload remains the only way to change source content; displayed details and the original-text disclosure are read-only. Missing fields do not block upload.

Clear Master Resume immediately empties all source sections, original text, file selection, filename history and current workspace. The dialog stays open with an empty state. A blank marker replaces saved master data and prevents recovery from older application snapshots; protected storage writes the same blank master into the encrypted vault. Storage failures keep a clear retry available and report that persistence could not be confirmed. Master-clear storage events invalidate stale copies in other tabs. Saved application versions remain separately managed. The release passes 132 automated checks; native browser and assistive-technology review remains pending.


## Complete master removal and role sections — version 21

Clear Master Resume acts directly on the button click, without a native confirmation popup that an embedded browser may suppress. deleteStoredMaster removes the unprotected master key and retains only the boolean lw-resume-studio-master-cleared-v1 flag, so older saved applications cannot silently restore it. Protected storage receives a blank master snapshot. All master subsections, imported text, source filename, formatting and filename history are removed from the master; the file picker and current workspace clear. Failures remain retryable. The app reads source bytes transiently and cannot delete the original file on the user’s device. Saved application versions remain separate.

Every detected role renders as its own expanded semantic section under Experience, with a uniquely labeled heading, role, company, years and its own accomplishment bullets. Roles at the same company stay separate. The release passes 133 automated checks; native browser and assistive-technology testing remains pending.


## Every job and evidence based keyword alignment — version 22

Imports recognize combined two-line employment headings as well as three-line and inline headings. All parsed jobs remain in source order in both tailoring lengths, including low-relevance roles and jobs without bullets. auditEmploymentHistory checks original titles, companies and dates and blocks generation if any job is lost. The preview reports the retained count; users should compare the parsed Experience list with their original file because heuristic extraction cannot certify every layout.

Keyword support excludes recognized negated experience and learning goals, and comes from qualification fields rather than contact or employer names. Separate affirmative source evidence can support a skill. Summaries do not invent a professional title from shared job keywords. Source-supported employer wording targets 10/10; unsupported requirements remain gaps and lower the score. The diagnostic is not live ATS certification or a hiring guarantee. All 138 automated checks pass, including all-job exports in Word, PDF and TXT. Native device and screen-reader testing remains pending.
