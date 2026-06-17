# Known Security Issues — Accepted Risks

Triaged items that are accepted for launch, with rationale. Feeds the Phase 29.3
threat model.

## Cloudinary media served via unsigned delivery URLs (LOW — accepted)

Uploaded media (post images, avatars, **DM photos**) is delivered from Cloudinary
over standard unsigned `secure_url`s. Anyone who has the exact URL can open it; the
CDN does not enforce auth on delivery.

**Why this is acceptable:**
- `public_id` is `UUID.randomUUID()` → URLs are unguessable; there is no
  enumeration IDOR (you cannot walk `/dm/1`, `/dm/2`, …).
- The message API is **participant-gated**: every read path
  (`getMessages`, `getMessagesCursor`, `markAsRead`) and the send paths call
  `MessageManager.verifyParticipant`, and the WebSocket broadcast targets only the
  two participants. A third party cannot obtain a DM image URL through the app.
- For a non-E2EE social app this matches industry norm (e.g. Discord ran
  unguessable-but-public CDN URLs at scale for years). A leaked URL is roughly
  equivalent to a leaked screenshot — the recipient could share the image anyway.

**If stronger privacy is ever required:** switch to Cloudinary `authenticated`
delivery + short-lived signed URLs generated server-side per participant. Not done
for launch (adds per-render signing, breaks caching, and risks expired-URL broken
images for marginal benefit).
