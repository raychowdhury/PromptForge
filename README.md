diff --git a//Users/ray/Desktop/New skills/Fun/vibe code agent/README.md b//Users/ray/Desktop/New skills/Fun/vibe code agent/README.md
deleted file mode 100644
--- a//Users/ray/Desktop/New skills/Fun/vibe code agent/README.md
+++ /dev/null
@@ -1,30 +0,0 @@
-# PromptForge (Frontend Only)
-
-A modern, responsive SPA that turns simple tasks into structured prompts and lets you test them locally with WebLLM in the browser.
-
-## Project structure
-```
-frontend/
-  src/
-    components/
-      PromptGenerator.jsx
-    styles/
-    App.jsx
-    main.jsx
-  index.html
-  vite.config.js
-  package.json
-```
-
-## Local setup
-```
-cd frontend
-npm install
-npm run dev
-```
-
-The app runs on `http://localhost:5173` by default.
-
-## Notes
-- All prompt generation is local in the browser.
-- Optional local AI testing uses WebLLM and WebGPU (Chrome/Edge recommended).
