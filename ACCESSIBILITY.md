# Accessibility review

Review date: 2026-10-09. Target: WCAG 2.2 Level AA for the application and its standalone download page. This is an implementation review, not a conformance certificate.

## Implemented

- English page language, descriptive titles, one main landmark, and a visible-on-focus skip link on both pages.
- Persistent, high-contrast keyboard focus indicators. Native modal dialogs have names, explicit initial focus, Escape handling, and return focus to the opening control. Saved applications move focus to their review heading.
- Review tabs use selected states, roving keyboard focus, named panels, and Left/Right/Home/End navigation. Edit controls are outside the tablist.
- Every form field has a label. Editors identify required and optional entries, expose contact-field purposes, and associate repeated role fields with their employer and title.
- Errors identify the affected field, set `aria-invalid`, associate the error while retaining instructions, and move focus to that field. Errors inside collapsed experience sections reveal the field first.
- Existing live regions announce preparation, completion, validation, and saving. Messages remain available until replaced. Messages within a modal use its own live region rather than the inert background.
- Text colors were revised against the app's light and dark palettes. Form boundaries and focus indicators exceed 3:1 contrast. Ordinary authored text colors meet 4.5:1; the oversized decorative brand dot meets 3:1.
- Controls have a minimum 44 by 44 CSS-pixel target at the default text size. Navigation labels and help remain available on small screens.
- Relative font sizes, wrapping tabs and actions, fluid layout columns, scrollable keyboard-accessible document previews, and a separately scrollable labeled data table support enlargement and narrow screens. Dialog action rows no longer overlap focused fields.
- Reduced-motion preferences disable animation, transitions and smooth scrolling. System forced-color focus and control outlines are supported. The app has no flashing effects or audio-only instructions.
- New-tab download links announce the new browsing context. File preparation and save-picker states are exposed. Plain text is a visible export choice for both documents.

## Automated verification

`npm test`: 79 tests passed, including 12 accessibility tests, 14 browser-capability simulations and the existing resume, cover-letter, writing and download checks. Accessibility checks inspect page and generated-editor semantics; calculate authored color contrasts; exercise tab keyboard behavior, focus transitions, error association, collapsed-field recovery, modal-local announcements, and busy states through a lightweight DOM adapter. The manual-copy fallback uses the same named-dialog and focus-return behavior.

The adapter verifies handler behavior and source structure. It does not render CSS, implement a browser accessibility tree, or emulate assistive technology. Browser-controlled modal containment and Escape behavior still require manual verification.

## Verification still required

The managed environment did not expose the Sites browser-control skill, so real-browser and assistive-technology QA could not run. Before declaring WCAG conformance, verify:

1. Complete keyboard journeys, native-dialog containment and Escape, and focus visibility at every scroll position.
2. Reading order, announcements, names and forms with NVDA/Firefox or Chrome, and VoiceOver/Safari; also a mobile screen reader.
3. Reflow at 320 CSS pixels, 200% text enlargement, 400% browser zoom, and user-defined WCAG text spacing, including all editors, history and download states.
4. Windows forced colors, platform high contrast, reduced motion, touch targets, and pointer cancellation in real browsers.
5. Browser accessibility-tree inspection and an independent automated accessibility scan, followed by manual resolution of findings.

PDF export text remains selectable, and Word and plain-text alternatives are available. Export files have not been audited for PDF/UA or document-accessibility conformance; this review does not assert that the PDFs are tagged.

Reference: https://www.w3.org/TR/WCAG22/


## Master resume upload — version 14

Master resume accepts local DOCX, text-based PDF, or UTF-8 TXT files up to 10 MB (PDF: 30 pages). Review the extracted text and editable draft before Save. Clear master resume deletes the saved master and uploaded text and cancels pending imports; saved applications are cleared separately. Scanned PDFs require a text copy. PDF.js 5.6.205 and JSZip 3.10.1 load locally on demand. Automated tests cover import, save, removal, errors and stale results; real-device and screen-reader upload validation remains pending.


## Formatting and privacy — version 15

Imports retain each final accomplishment within its job and preserve uploaded role/company/year heading order across preview, Word, PDF and TXT. Privacy and password provides opt-in AES-256-GCM protection of browser-local saved data, with a passphrase required after reopening. Without it, a shared browser profile can access saved records. Download links carry only temporary session-bound identifiers, not documents. Same-origin content restrictions and no-referrer metadata are present on both pages. Real browser, device and screen-reader verification remains pending.
