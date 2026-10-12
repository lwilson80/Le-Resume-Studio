# Privacy and security

Applicant files are read in the browser. The static application does not send resumes, cover letters, passwords or job descriptions to a server, applicant database, analytics provider or other user. App sharing distributes the application, not its browser records.

Use Privacy and password before leaving saved data on a shared device. Protection is opt-in; ordinary local storage is readable by people using the same browser profile until protected. Enabling protection encrypts the master and history with Web Crypto AES-256-GCM, a fresh 96-bit IV and a nonextractable key derived with PBKDF2-HMAC-SHA-256 (600,000 iterations, random 128-bit salt). The passphrase and key are not stored or sent. Reload starts locked. There is no password recovery or server account. Lock before handing over the device; close download tabs and protect downloaded files separately.

Private download URLs contain only random session-bound tokens. Snapshots stay in sessionStorage, expire after five minutes before receipt, and are consumed by the opened tab. The source removes its copy; unrelated sessions and replays fail. The recipient can refresh its own prepared download. Browser popup and opener-storage behavior require real-device testing.

Both HTML pages restrict scripts and connections to same-origin assets, block object embeds and form submission, and suppress referrers. Stored text is escaped before HTML rendering. Uploads are size-limited; PDF evaluation is disabled; export payloads are validated. Vendors and licenses are included locally.

These measures do not protect an unlocked tab or a compromised device and are not an independent penetration test or Instagram-style account service. Server authentication, MFA and cloud user storage would require a separate backend design. Never commit applicant data, browser records, private keys or credentials. Use fictional test identifiers.

References checked October 12, 2026:
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
