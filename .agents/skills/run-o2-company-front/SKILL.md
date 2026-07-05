---
name: run-o2-company-front
description: Run and drive the O2 Company Frontend web application using chromium-cli
---

Launches the O2 Company Frontend React/Vite web application and drives it with chromium-cli for automated interaction. The application is a POS (Point of Sale) and administration system.

## Prerequisites

Install Chromium and dependencies:

```bash
sudo apt-get update
sudo apt-get install -y chromium-browser
```

## Build

Install dependencies and build for production:

```bash
npm install
npm run build
```

## Run (Agent Path)

Launch the development server and drive it with chromium-cli:

1. Start the dev server in background:
   ```bash
   npm run dev &
   VITE_PID=$!
   ```

2. Wait for server to start (typically 2-3 seconds):
   ```bash
   sleep 3
   ```

3. Use chromium-cli to interact with the application:
   ```bash
   npx chromium-cli http://localhost:5173 \
     --wait-for-selector="body" \
     --screenshot=./screenshot.png
   ```

4. Stop the dev server when done:
   ```bash
   kill $VITE_PID
   ```

Common chromium-cli commands for interaction:
- `--screenshot=file.png` - Capture screenshot
- `--wait-for-selector="selector"` - Wait for element to appear
- `--eval="javascript"` - Execute JavaScript in page context
- `--click="selector"` - Click an element
- `--fill="selector=value"` - Fill form input

## Run (Human Path)

For manual testing:
```bash
npm run dev
```
Then visit http://localhost:5173 in your browser.

To preview the production build:
```bash
npm run preview
```

## Gotchas

- The dev server may start on a port other than 5173 if it's in use (check output for the actual port)
- chromium-cli requires Chromium to be installed; it won't work with Chrome
- When running in CI/headless environments, you may need to add `--no-sandbox` to chromium-cli
- The first load may take longer as Vite optimizes dependencies

## Troubleshooting

**Symptom**: "chromium-browser: command not found"
**Fix**: Install chromium-browser with `sudo apt-get install -y chromium-browser`

**Symptom**: Application shows blank screen or fails to load
**Fix**: Check that the dev server is running and accessible; verify the port in the Vite startup output

**Symptom**: chromium-cli times out waiting for selector
**Fix**: Increase wait time or verify the selector exists; use `--timeout` flag with chromium-cli

**Symptom**: "Address already in use" when starting dev server
**Fix**: Kill existing process on port 5173 or let Vite choose another port (it will show the actual port in output)
