# ATS format and keyword review

Updated October 11, 2026. All 46 user-supplied platform names are selectable in Section 1. The platform preference is retained with saved versions and download handoffs, and resets to General ATS format when the workspace resets.

The selector applies a shared conservative export format; it is not an integration, certification, or successful submission test. Employer configuration, screening questions, qualifications, and parser/scoring implementations can determine results independently of keyword coverage. Platforms without verified guidance use the employer's actual upload instructions. No live applications were submitted.

## Keyword target

The resume and cover letter independently target 100% (10/10) of unique detected job phrases. Multiple employer alternatives within one catalog concept are each required; duplicate normalized phrases count once. Matches normalize case and punctuation. A phrase contributes to the score only if it appears and is supported by the master resume. Unsupported terms remain in the denominator even if manually inserted. Cover scoring uses the letter body, not its contact block or subject. Additional terms absent from the job description do not affect the denominator.

Detection uses the existing keyword catalog and explicitly stated skill/tool detection, not all words or all semantic requirements in a posting. Visitors can supply missed phrases. The UI discloses this scope, shows missing phrases and source evidence, and cannot mark a partial match as 10/10 through rounding. Full keyword coverage does not establish ATS acceptance or suitability for a role.

## Document format

Word exports use Arial, black text, a Title style and semantic Heading 1 resume sections, one column, ordinary paragraphs and real bullets. Employer, title, and dates are separate paragraphs. Contact information is in the body. No tables, text boxes, images, hidden text, headers, or footers are used. Body text is 11 pt and contact text 10.5 pt.

PDF exports use selectable text, black text, embedded Nimbus Sans font programs, one column, separate employer/title/date lines, and plain section headings. Resume body text is 11 pt; no images or decorative rules are used. The current PDF exporter transliterates Latin accents and substitutes unsupported characters; the prepared-download review warns users to select Word or plain text when characters exceed the PDF character set. Word and plain text retain Unicode.

## Verified platform guidance

| Profile | Guidance used | Scope |
| --- | --- | --- |
| Greenhouse | 2.5 MB resume parsing limit; avoid complex layouts, graphics, columns, and contact details in headers/text boxes. | Resume parsing, not a ranking guarantee. |
| Workable | Resume field accepts DOCX/PDF among its formats, with a 5 MB limit. TXT is not in the resume list. | Cover/custom attachment limits are not assumed to equal the resume limit. |
| Workday | HiredScore documents DOCX/PDF/TXT attachments and keyword-based searches. | Related HiredScore product documentation; the employer's Workday form governs uploads. |
| SAP SuccessFactors | Candidate profile documentation includes DOCX/PDF/TXT for resume and cover letter uploads. | Employer configuration still governs available formats. |

Primary sources checked October 11, 2026:

- https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse
- https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form
- https://doc.workday.com/hiredscore/en-us/workday-hiredscore/recruiter-productivity-/concept--candidate-profiles.html
- https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/candidate-profile-in-sap-successfactors

## Validation

`npm test`: 93 passing automated checks, including the complete platform list, exact multi-phrase coverage, unsupported claims, file-format/size warnings, preferences, saved-version reopening, reset/deletion, transfers, exports, keyboard tabs, and label/ARIA checks.

`tests/ats-export-check.mjs` generated actual files with the same vendored browser libraries as the app. Two fixtures covered a 17-phrase business analyst posting and a 93-phrase broad operations posting. Both resume and cover letter achieved 10/10. All eight Word/PDF exports preserved every detected job phrase, applicant name/email, and resume career facts when text was extracted. Word XML checks found the intended five semantic section headings, separate employer/title/date paragraphs, and no complex-layout or hidden-text elements. PDF checks found embedded fonts, extractable text, and no images. Samples were approximately 9.6–99.1 KB.

All 16 final rendered pages were visually inspected. Resumes used three pages for seven retained roles and education; both cover letters fit one page in Word and PDF. Real browser/device, assistive-technology, and live ATS parser tests remain unverified. Sites browser QA was skipped because the control-browser skill was unavailable, as required by the Sites workflow.
