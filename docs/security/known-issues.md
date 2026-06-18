# Known Security Issues — Accepted Risks

Triaged items that are accepted for launch, with rationale. Feeds the Phase 29.3
threat model.

## DM photos: authenticated delivery + signed URLs (no hard expiry)

**DM photos** are uploaded to Cloudinary as `type=authenticated` and stored as a
bare `public_id` (`messages.image_public_id`). They are **not** reachable via a
plain CDN URL — only the backend (holding `api_secret`) can mint a valid signed
delivery URL, and it only does so inside the participant-gated message responses
(`MessageMapper.signImage` → `CloudinaryStorageService.signedImageUrl`). Every read
path calls `MessageManager.verifyParticipant`, and the WebSocket broadcast targets
only the two participants.

**Residual (LOW — accepted):** signed URLs have **no hard expiry** (hard expiry
needs Cloudinary auth tokens, a paid feature). A signed URL that is *leaked after
it's minted* stays viewable — roughly equivalent to a leaked screenshot, which the
recipient could share anyway. Enabling short-expiry auth tokens later is a config
add-on.

## Post images & avatars served via unsigned public URLs (LOW — accepted)

Post images and avatars are **public content** and are delivered over standard
unsigned `secure_url`s with an unguessable `UUID` `public_id` (no enumeration). No
change planned — these are meant to be publicly viewable.
