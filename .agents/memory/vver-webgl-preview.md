---
name: VVER walkthrough WebGL preview limitation
description: The screenshot capture browser cannot provide WebGL 2 for this app.
---

The Replit screenshot capture browser used with the VVER walkthrough cannot create a WebGL 2 context. It can verify the React navigation overlay and the no-WebGL recovery state, but it cannot confirm that Three.js geometry, lighting, or materials render.

**Why:** Repeated preview captures failed at WebGL context creation while the Vite workflow and production build succeeded.

**How to apply:** Do not treat the capture screenshot as proof that the 3D scene is visually correct. Verify the walkthrough in a regular browser with WebGL 2 enabled, and report this capture limitation plainly.
