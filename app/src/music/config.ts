// The app's id at Spotify, which the link in spotify.ts is made with.
//
// It is public by design: the link uses PKCE, which needs no secret, so the id
// can stand here in the open. While it is empty the link is off, and nothing
// about music is offered anywhere. A build can also be given one from outside,
// as VITE_SPOTIFY_CLIENT_ID, which then wins.
//
// The id is that of an app made at developer.spotify.com by whoever runs the
// city. The app must list, as redirect addresses, every address the city is
// opened at: the published one, and http://127.0.0.1:<port>/ for the
// development server (Spotify does not take localhost). While such an app is
// in development mode, only the accounts its owner names may make the link.

export const SPOTIFY_CLIENT_ID = 'f7f4764ce12f4477aa0638fdc3341d69';
