# Multi-Sensor Network Dashboard

Web dashboard for monitoring environmental sensor data (temperature, humidity, CO₂) from ESP32 devices.

🌐 **Live Demo:** https://multi-sensor-vercel.vercel.app/

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── ingest.js          # POST endpoint for sensor data
│   ├── events.js          # SSE endpoint (limited on Vercel)
│   └── status.js          # API status endpoint
├── index.html             # Main dashboard page
├── about.html             # About page
├── contact.html           # Contact page
├── script.js              # Frontend JavaScript
├── style.css              # Stylesheet
├── vercel.json            # Vercel deployment configuration
├── package.json           # Node.js configuration
└── wifi-data-import.tex   # LaTeX documentation for WiFi data import
```

## Quick Start

### Deploy to Vercel

1. Push this repository to GitHub
2. Import project in Vercel
3. Framework Preset: **Other** (or leave blank)
4. Build Command: (leave empty)
5. Output Directory: (leave empty)
6. Deploy

### API Endpoints

- `POST /api/ingest` - Send sensor data
  ```json
  {
    "temperature": 23.5,
    "humidity": 45.2,
    "co2": 420
  }
  ```

- `GET /api/status` - Check API status
- `GET /api/events` - Server-Sent Events (limited on Vercel)

### Sending Data from ESP32

See `wifi-data-import.tex` for detailed instructions on sending sensor data via WiFi.

Quick example:
```bash
curl -X POST https://your-app.vercel.app/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"temperature": 23.5, "humidity": 45.2, "co2": 420}'
```

## Features

- Real-time sensor data visualization
- Temperature, humidity, and CO₂ monitoring
- Interactive facility map with sensor locations
- Historical data charts
- Responsive design

## Requirements

- Vercel account (free tier works)
- ESP32 devices with WiFi capability
- Sensors: SCD41 (CO₂, temperature, humidity)

## Documentation

- `wifi-data-import.tex` - Complete guide for WiFi data import with ESP32, Python, and cURL examples

## License

[Add your license here]

