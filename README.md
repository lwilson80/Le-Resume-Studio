# Le Resume Studio

An access-controlled, buildless Sites application. New visitors start with an empty master resume and enter their own contact details, summary, competencies, roles, skill groups, and education. No personal resume is bundled in the published files. The editor can add and remove entries, validates the required career facts, and preserves unsaved fields while adding entries. Tailoring stays disabled until a complete master is saved.

Existing browser-saved masters are preserved. When the master key is missing or corrupt, the app can recover a valid source snapshot from that same browser's saved applications and stores it independently. Clear master resume writes an explicit blank marker so history cannot silently repopulate an intentionally cleared master. Sharing the Site link transfers neither the master nor saved history; users sharing one browser profile can access unprotected local data. Enable Privacy and password before leaving saved data on a shared device. A protected workspace starts locked on a new load.

The app runs locally in the visitor's browser. It uses a catalog of common job terms, detects named tools and explicitly stated skills, checks source evidence, prioritizes relevant bullets, and substitutes equivalent resume terminology. It does not use an AI API or fabricate missing qualifications. Keyword coverage is a diagnostic text overlap measure, not an ATS score.

Every tailored resume also generates a matching cover letter from supported job terms and accomplishments in that same resume. The cover letter can be edited and downloaded independently as Word, PDF, or plain text. Earlier saved versions receive a matching letter when opened. Resume edits regenerate the letter until the visitor customizes the letter; customized letter text is preserved.

The writing profile uses the perspective of a hiring manager and HR professional with more than twenty years of experience. This is a writing lens, not a claim of human review or additional applicant tenure. It prioritizes supported qualifications, relevant accomplishments, clear English, and the user's complete nine-category action-verb bank. Conservative English edits fix punctuation, repeated function words, selected wording errors, and degree-title grammar. Verb substitutions preserve responsibility; support work is not rewritten as leadership. Current roles retain present tense. Unrecognized openings and long sentences are flagged for review. These rules do not constitute a comprehensive grammar checker.

Resume and cover letter keyword scores independently target 100% (10/10) of every unique detected job phrase. Each employer alternative is required, using case/punctuation normalization. Unsupported requirements stay in the denominator and are never inserted to raise the score. Additional terms absent from the posting are excluded. Cover scores use paragraph text. Missing phrases, evidence gaps, and the maximum supported coverage are disclosed; rounding cannot mark an incomplete match as 10/10. The engine adds missing supported wording to resume skills and grouped letter prose while preserving accomplishments. Saved documents and manual edits are rescored without replacing customized content. Detection is limited to the catalog and explicitly stated skills/tools; users can add missed phrases.

The master resume and up to ten tailored applications are saved on the visitor's device, including cover letters. Privacy and password encrypts these records in a local vault when enabled; otherwise they use ordinary localStorage. Sections 1 and 2 start blank on every app load, reload, browser restart, and browser back/forward restoration. Job title, company, job description, and additional keywords are cleared; preferences return to their defaults. Resume and cover letter previews remain empty until the visitor creates an application or explicitly opens a saved version. Job drafts are no longer persisted, and the legacy draft cache is removed. A reset also closes editors and save dialogs and invalidates pending generation/export results. The master resume and saved versions remain available from the sidebar. Word, PDF, and plain text exports use single-column layouts; PDF text is selectable.

Exports now prepare a file and keep an explicit save link available instead of automatically clicking and discarding a Blob link. Where supported, a user click opens the native save picker and confirms success only after writing and closing the file. Other browsers use their download manager, with no claim that a requested download has completed. When the app runs inside ChatGPT, Open download page carries the exact selected document to a separate browser page; it uses an independent copy of the opener's sessionStorage. A five-minute transfer token enters the URL; the document never does. The parent removes the transfer record, the receiving tab consumes it and clears the token, and that tab retains its own snapshot for refresh. An unrelated browser session cannot retrieve a copied token. Blocked popups or session storage leave direct saving available. Generated files are saved through the visitor's browser, not stored on the Site server.

Clear saved versions deletes each saved application as a whole, including its resume, cover letter, source snapshot, job description, and reviews, immediately on the button click. It removes the unprotected history key (with an empty-array fallback), or awaits an encrypted empty-history write when password protection is enabled, clears the in-memory list and current application, closes editors and prepared save dialogs, revokes download links, and resets the saved count to zero. Other open app tabs respond to the storage deletion so they cannot restore stale history. The master resume is retained. Storage deletion failures leave an explicit message and an enabled retry button instead of claiming success. Already downloaded files and separate download-page snapshots are outside the app's saved-version history.

Source modules are in `dist/`. Vendored `docx` and `pdf-lib` browser builds include their upstream licenses in `dist/vendor/`.

Validation: `npm test` (93 passing checks). The checks include all six resume/cover letter exports, transfers between app and browser contexts, save completion and cancellation, and download-manager fallback. ATS export validation uses the primary artifact runtime with `tests/ats-export-check.mjs` and the same vendored browser libraries as the app. `ATS_COMPATIBILITY.md` records rendered-document/text-extraction checks and verification limits.

Accessibility targets WCAG 2.2 AA. The app includes keyboard tabs, named dialogs with focus return, persistent screen-reader status messages, associated field errors, larger targets, revised contrast, relative text sizes, reflow rules, reduced motion and forced-color support. `ACCESSIBILITY.md` records the implemented improvements, automated checks and the browser/assistive-technology verification still needed before a conformance claim.

Browser/mobile improvements include safe-area spacing, keyboard viewport sizing, larger-text wrapping, Safari syntax fixes, optional native file sharing, selectable-text clipboard fallback, and a persistent notice when browser storage is unavailable. Word/PDF dependencies load on demand to keep the initial UI lighter. `BROWSER_COMPATIBILITY.md` records the capability fallbacks and the real-device verification still needed.

The vendored Nimbus Sans font programs keep PDF spacing consistent. Their original OpenType files and license are included alongside the extracted CFF assets.

The hosting manifest is `.openai/hosting.json`. Deploy through the Sites source workflow, save a Site version, and deploy it while preserving the current sharing audience.

All 46 requested ATS names are selectable. An ATS review checks resume content and explains the shared export format, with verified platform guidance for Greenhouse, Workable, Workday HiredScore (scope disclosed), and SAP SuccessFactors. Prepared downloads show the actual file size and applicable format/size warnings. The app does not integrate with these systems or guarantee acceptance.


## Documentation

These guides describe the published version 13, reviewed October 11, 2026.

| Guide | PDF | Editable Word |
| --- | --- | --- |
| User tutorial | [PDF](docs/Le_Resume_Studio_User_Tutorial.pdf) | [Word](docs/Le_Resume_Studio_User_Tutorial.docx) |
| Developer guide | [PDF](docs/Le_Resume_Studio_Developer_Guide.pdf) | [Word](docs/Le_Resume_Studio_Developer_Guide.docx) |
| Web and mobile browsers | [PDF](docs/Le_Resume_Studio_Web_Mobile_Browser_Guide.pdf) | [Word](docs/Le_Resume_Studio_Web_Mobile_Browser_Guide.docx) |

## Run the source

Serve `dist/` with a static HTTP server. For example, from the repository root run `python3 -m http.server 8000 --directory dist`, then open `http://localhost:8000`. Python is only an optional development server; the app itself uses HTML, CSS, and JavaScript.

Run `npm test` with a recent Node.js release. There is no npm installation or build step for the browser app. Test fixtures use fictional contact details, employers, and schools and are not used as app defaults. No applicant master or saved browser history is included.

Production hosting remains configured in `.openai/hosting.json`; this repository transfer does not change the live Site audience or its deployment.


## Master resume upload — version 14

Master resume accepts local DOCX, text-based PDF, or UTF-8 TXT files up to 10 MB (PDF: 30 pages). Review the extracted text and editable draft before Save. Clear master resume deletes the saved master and uploaded text and cancels pending imports; saved applications are cleared separately. Scanned PDFs require a text copy. PDF.js 5.6.205 and JSZip 3.10.1 load locally on demand. Automated tests cover import, save, removal, errors and stale results; real-device and screen-reader upload validation remains pending.


## Formatting and privacy — version 15

Imports retain each final accomplishment within its job and preserve uploaded role/company/year heading order across preview, Word, PDF and TXT. Privacy and password provides opt-in AES-256-GCM protection of browser-local saved data, with a passphrase required after reopening. Without it, a shared browser profile can access saved records. Download links carry only temporary session-bound identifiers, not documents. Same-origin content restrictions and no-referrer metadata are present on both pages. Real browser, device and screen-reader verification remains pending.
