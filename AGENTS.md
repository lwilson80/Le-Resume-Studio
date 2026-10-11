# Le Resume Studio maintenance instructions

## Standing user request

For every future app update, upload the new app version to `lwilson80/Le-Resume-Studio` and update and upload its documentation. The user authorized this ongoing workflow on October 11, 2026; routine release uploads do not need another confirmation.

The hosted app is Sites project `appgprj_6ac7b2d96ac48191874b7dc329630b3b`. Preserve its identity and sharing configuration. GitHub uploads do not replace the normal Sites publishing workflow.

## Required release workflow

1. Read the latest repository state and applicable skills before editing. Preserve unrelated work and use the existing GitHub repository as the base for the release.
2. Implement and validate the app update. Preserve the blank first-visitor master resume, browser-local saved versions, and the copyright "2026 Marabou Lane LLC".
3. Review and update all three guides for the release: the User Tutorial, Developer Guide, and Web and Mobile Browser Guide. Keep their version numbers, dates, features, API and language descriptions, screenshots or examples, and testing limitations accurate. Update README and compatibility notes when affected.
4. Save each guide in both Word and PDF format under `docs/`, retaining the existing filenames. Read the documents/PDF skills and render and inspect the revised documents before upload. Keep both formats consistent.
5. Upload the app source, required export libraries and licenses, applicable tests, and all six revised documentation files to GitHub. Exclude credentials, browser storage, saved applicant documents, and personal resume defaults. Keep test applicant identifiers fictional. Transfer the current source snapshot, not the older Sites Git history.
6. Run checks appropriate to the actual app change. Do not claim real-device, screen-reader, WCAG, or named ATS certification without the relevant validation; keyword scores must reflect source-supported qualifications.
7. Preserve unrelated repository content and history. Never force-push. If the branch changes concurrently, reread its head and incorporate those changes before updating it.
8. Verify the remote app and all six documentation files against the prepared files. Update `.openai/github-sync.json` only after the matching app release and documentation have been uploaded and verified.
9. Report the GitHub release commit and documentation link. If authentication, automatic approval review, or another blocker prevents completion, report the incomplete step accurately.

## Background synchronization

A linked Sites task checks for published app updates. Compare the latest successfully published version and its source provenance with `.openai/github-sync.json`; a documentation-only or maintenance-only GitHub commit is not a new app release. If an update is missing, complete the same release workflow above. If already synchronized, make no changes and send no notification. A failed or partially completed synchronization must remain retryable, without advancing the completed-release record.

In background runs, synchronize the existing published app; do not independently change its features or publish an additional Site version.
