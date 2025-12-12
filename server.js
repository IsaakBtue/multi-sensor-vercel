import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Shared state for sensor readings (in-memory storage)
let latestReading = null;
let lastUpdateTime = null;
let latestHttpBridgeReading = null;
let lastHttpBridgeUpdateTime = null;

// API Routes

// /api/ingest - Main ingest endpoint
app.get('/api/ingest', (req, res) => {
  if (latestReading && lastUpdateTime) {
    const age = Date.now() - lastUpdateTime;
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (age < maxAge) {
      return res.status(200).json({
        ok: true,
        hasReading: true,
        reading: latestReading,
        timestamp: new Date(lastUpdateTime).toISOString(),
        age: Math.round(age / 1000)
      });
    } else {
      return res.status(200).json({
        ok: true,
        hasReading: false,
        message: 'No recent reading available',
        lastReading: latestReading,
        lastUpdate: new Date(lastUpdateTime).toISOString()
      });
    }
  } else {
    return res.status(200).json({
      ok: true,
      hasReading: false,
      message: 'No reading available yet'
    });
  }
});

app.post('/api/ingest', (req, res) => {
  const m = req.body;
  
  // Validate payload - accept various formats
  let reading = null;
  
  // Format 1: Direct fields (from ESP32: includes mac, device_id, temperature, humidity, co2)
  if (m && typeof m.co2 === 'number') {
    reading = {
      temperature: typeof m.temperature === 'number' ? m.temperature : 0,
      co2: m.co2,
      humidity: typeof m.humidity === 'number' ? m.humidity : 0
    };
  }
  // Format 2: Nested in reading object
  else if (m && m.reading && typeof m.reading.co2 === 'number') {
    reading = {
      temperature: typeof m.reading.temperature === 'number' ? m.reading.temperature : 0,
      co2: m.reading.co2,
      humidity: typeof m.reading.humidity === 'number' ? m.reading.humidity : 0
    };
  }
  
  if (!reading) {
    return res.status(400).json({ ok: false, error: 'Invalid payload - must include co2 as number' });
  }

  // Store the reading
  latestReading = reading;
  lastUpdateTime = Date.now();

  console.log('INGEST:', req.body);
  console.log('Stored reading:', reading);
  
  return res.status(200).json({ 
    ok: true,
    message: 'Reading stored successfully',
    reading: reading
  });
});

// /api/ingest-http-bridge - HTTP bridge for ESP32 Gateway
app.get('/api/ingest-http-bridge', (req, res) => {
  if (!latestHttpBridgeReading || !lastHttpBridgeUpdateTime) {
    return res.status(200).json({ 
      ok: true, 
      hasReading: false, 
      reading: {
        mac: null,
        device_id: null,
        temperature: 0,
        co2: 0,
        humidity: 0,
        ts: Date.now()
      },
      message: 'No sensor data received yet' 
    });
  }

  const age = Date.now() - lastHttpBridgeUpdateTime;
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  if (age < maxAge) {
    return res.status(200).json({
      ok: true,
      hasReading: true,
      reading: latestHttpBridgeReading,
      timestamp: new Date(lastHttpBridgeUpdateTime).toISOString(),
      age: Math.round(age / 1000)
    });
  } else {
    return res.status(200).json({
      ok: true,
      hasReading: false,
      message: 'No recent reading available',
      lastReading: latestHttpBridgeReading,
      lastUpdate: new Date(lastHttpBridgeUpdateTime).toISOString()
    });
  }
});

app.post('/api/ingest-http-bridge', (req, res) => {
  const m = req.body;
  
  // Validate payload - accept format from ESP32 Gateway
  if (
    !m ||
    typeof m.co2 !== 'number' ||
    typeof m.temperature !== 'number' ||
    typeof m.humidity !== 'number'
  ) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Invalid payload - must include temperature, humidity, and co2 as numbers' 
    });
  }

  // Store the reading with device identifier
  latestHttpBridgeReading = {
    mac: m.mac || m.device_id || null,
    device_id: m.device_id || m.mac || null,
    temperature: m.temperature,
    co2: m.co2,
    humidity: m.humidity,
    ts: Date.now(),
  };
  lastHttpBridgeUpdateTime = Date.now();

  console.log('INGEST (via HTTP bridge):', latestHttpBridgeReading);
  console.log('Received from device:', latestHttpBridgeReading.device_id || latestHttpBridgeReading.mac || 'unknown');

  return res.status(200).json({ 
    ok: true, 
    message: 'Data received via HTTP bridge',
    reading: latestHttpBridgeReading,
    note: 'This endpoint accepts HTTP for ESP32 compatibility'
  });
});

// /api/status - API status endpoint
app.get('/api/status', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    platform: 'railway',
    endpoints: {
      ingest: 'POST /api/ingest',
      'ingest-http-bridge': 'POST /api/ingest-http-bridge',
      status: 'GET /api/status',
      events: 'GET /api/events',
      dashboard: 'GET /'
    }
  });
});

// /api/events - Server-Sent Events endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write('retry: 1000\n\n');
  res.write(`data: ${JSON.stringify({ 
    message: 'SSE endpoint active on Railway',
    recommendation: 'Use polling or WebSocket for real-time updates'
  })}\n\n`);

  // Keep connection alive and send periodic updates
  const interval = setInterval(() => {
    if (latestReading || latestHttpBridgeReading) {
      const reading = latestHttpBridgeReading || latestReading;
      res.write(`data: ${JSON.stringify({ 
        type: 'sensor_update',
        reading: reading,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }
  }, 5000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/about.html', (req, res) => {
  res.sendFile(join(__dirname, 'about.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(join(__dirname, 'contact.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚂 Server running on Railway at http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
  console.log(`📡 API Ingest: http://localhost:${PORT}/api/ingest`);
  console.log(`🌉 HTTP Bridge: http://localhost:${PORT}/api/ingest-http-bridge`);
});

