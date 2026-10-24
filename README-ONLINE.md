# Digital Swami Online Multiplayer (Android-friendly setup)

This package contains the game HTML and a Node.js WebSocket room relay. It is designed to be deployed to a public Node hosting service that supports WebSockets (example: Render). Hosting provider free-tier policies and sleep behavior may change.

## Deploy using Render
1. Create/sign in to GitHub and create a repository.
2. Upload these files to the repository root.
3. In Render, choose **New + > Blueprint** and connect the repository. Render reads `render.yaml`; alternatively create a Node Web Service with build command `npm install` and start command `npm start`.
4. Wait for deployment and open `https://YOUR-SERVICE.onrender.com/health`. It should return JSON with `ok: true`.
5. In the game page, choose **Online Play**. In the WebSocket URL field enter `wss://YOUR-SERVICE.onrender.com` (use the exact host assigned by your provider, with `wss://`, no `/health`).
6. One player creates a room and shares the 4-letter room code. Other players use the same WSS URL and room code.

## Android-only access
You can do the setup from Chrome on Android, but the hosting service runs the server in the cloud. This is more reliable for online play across different networks than running a server on the phone. For local hotspot-only play, use the Termux package instead.

## Limits and security notes
- This is a lightweight room relay, not a database-backed game platform. Rooms are in memory and disappear when the server restarts or sleeps.
- The relay supports up to 8 connections per room. It forwards game events; each game's frontend must implement the matching multiplayer event handlers to synchronize that game's state. It does not magically convert every single-player game into a fully synchronized online game.
- Add authentication, rate limiting, persistent state, and server-side validation before using for a large public audience.
- Do not place secrets or credentials in the HTML.
