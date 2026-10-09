# Spotify account playback — pending configuration

Preview only. Published 2.4.4 is unchanged. No animation experiments included.

1. Sign in to https://developer.spotify.com/dashboard with the developer account. Create an app named Luna. Select Web API and Web Playback SDK. Spotify may require accepting developer terms: the account owner completes this step.
2. Add this exact redirect URI: `https://cagansezerkaraman00-byte.github.io/Hazal-cal-sma-/`.
3. For a local real-login test also allow `http://127.0.0.1:8794/`.
4. In User Management add Hazal's Spotify account email if required for development mode. The developer account must meet Spotify's current eligibility requirements; the playback account needs Premium.
5. Copy the public Client ID into `js/spotify-config.js`. Do not copy the Client Secret. End users see only Spotify login.
6. Test login with Premium on target iPad and Android device, load playlists, open Luna player, play, pause, next and previous. Verify actual full playback and study timer continuity. Spotify's iOS player requires a user tap for audio activation. Background streaming depends on device/browser suspension.
7. Rebuild and run release checks after configuration. Get user approval before publishing.

Implementation uses PKCE plus expiring, one-use state bound to client and redirect. Spotify handles passwords. Tokens are stored only on the device, never in the repository. Old playlist-only tokens must reauthorize for streaming. SDK loads only after the user requests the player; SDK failure does not block Luna startup. Logout disconnects the device. Embedded player remains the fallback.

References: Spotify Web Playback SDK getting-started, SDK reference, OAuth PKCE flow, and quota modes (official developer.spotify.com documentation).
