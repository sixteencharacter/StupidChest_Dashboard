# KnockLock IoT Dashboard

## Features
* **Device Control & State**: View live battery/RSSI telemetry and trigger manual Lock/Unlock actions.
* **Threshold Configuration**: Adjust Sensitivity (`activation_threshold`) and RMSE (`predict_threshold`) with automatic payload conversion.
* **Live System Log**: Polls the backend event stream to display access passes/fails and system telemetry in real-time.
* **Pattern Recording**: Uses the browser's Web Audio API to visualize microphone input  while communicating with the backend's learning endpoints.
* **Live Signal Charts**: Implements Recharts to display simulated streaming data and recorded knocking patterns.

## docker
Ensure your KnockLock API, Redis, and Mosquitto broker are running.

Build and run the dashboard using

    docker compose up -d --build

Open http://localhost:3000 in your browser.
## local
run the Next.js application  locally for development:
    npm install
    npm run dev