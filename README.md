# Multi-Sensor Network Dashboard

Web dashboard for monitoring environmental sensor data (temperature, humidity, CO₂) from ESP32 devices.

## Project Structure

```
├── server.js              # Express.js server (Railway deployment)
├── api/                   # Legacy Vercel serverless functions (kept for reference)
│   ├── ingest.js          # POST endpoint for sensor data
│   ├── ingest-http-bridge.js  # HTTP bridge for ESP32
│   ├── events.js          # SSE endpoint
│   └── status.js          # API status endpoint
├── index.html             # Main dashboard page
├── about.html             # About page
├── contact.html           # Contact page
├── script.js              # Frontend JavaScript
├── style.css              # Stylesheet
├── package.json           # Node.js configuration with Express
├── Procfile               # Railway deployment configuration
├── railway.json           # Railway deployment settings
├── vercel.json            # Legacy Vercel configuration (optional)
└── wifi-data-import.tex   # LaTeX documentation for WiFi data import
```

## Quick Start

### Deploy to Railway 🚂

1. **Install Railway CLI** (optional, or use web interface):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize and deploy**:
   ```bash
   railway init
   railway up
   ```

   Or use the **Railway web interface**:
   - Push this repository to GitHub
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect the Node.js project and deploy

4. **Get your Railway URL**:
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - The dashboard will be available at: `https://your-app.up.railway.app/`
   - API ingest endpoint: `https://your-app.up.railway.app/api/ingest`

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the server**:
   ```bash
   npm start
   ```

3. **Access the dashboard**:
   - Open http://localhost:3000 in your browser

### API Endpoints

- `POST /api/ingest` - Send sensor data (main endpoint)
  ```json
  {
    "temperature": 23.5,
    "humidity": 45.2,
    "co2": 420
  }
  ```

- `GET /api/ingest` - Retrieve latest sensor reading

- `POST /api/ingest-http-bridge` - HTTP bridge for ESP32 Gateway (accepts plain HTTP)
  ```json
  {
    "device_id": "AA:BB:CC:DD:EE:FF",
    "temperature": 23.5,
    "humidity": 45.2,
    "co2": 420
  }
  ```

- `GET /api/ingest-http-bridge` - Retrieve latest reading from HTTP bridge

- `GET /api/status` - Check API status and platform info

- `GET /api/events` - Server-Sent Events stream (works on Railway)

### Sending Data from ESP32

See `wifi-data-import.tex` for detailed instructions on sending sensor data via WiFi.

**Quick example with Railway**:
```bash
curl -X POST https://your-app.up.railway.app/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"temperature": 23.5, "humidity": 45.2, "co2": 420}'
```

**For ESP32 Gateway (HTTP bridge)**:
```bash
curl -X POST https://your-app.up.railway.app/api/ingest-http-bridge \
  -H "Content-Type: application/json" \
  -d '{"device_id": "AA:BB:CC:DD:EE:FF", "temperature": 23.5, "humidity": 45.2, "co2": 420}'
```

## Features

- Real-time sensor data visualization
- Temperature, humidity, and CO₂ monitoring
- Interactive facility map with sensor locations
- Historical data charts
- Responsive design
- Server-Sent Events (SSE) support on Railway
- HTTP bridge endpoint for ESP32 devices with SSL/TLS limitations

## Requirements

- Node.js 18+ (for Railway deployment)
- Railway account (free tier available)
- ESP32 devices with WiFi capability
- Sensors: SCD41 (CO₂, temperature, humidity)

## Platform Comparison

| Feature | Vercel | Railway |
|---------|--------|---------|
| Serverless Functions | ✅ | ❌ |
| Express.js Server | ❌ | ✅ |
| SSE Support | Limited | ✅ Full |
| Persistent Connections | ❌ | ✅ |
| HTTP Bridge | ✅ | ✅ |
| Free Tier | ✅ | ✅ |

## Documentation

- `wifi-data-import.tex` - Complete guide for WiFi data import with ESP32, Python, and cURL examples

## License

[Add your license here]

