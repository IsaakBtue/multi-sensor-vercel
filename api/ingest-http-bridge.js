// HTTP Bridge for ESP32 Gateway
// This endpoint accepts HTTP POST requests from ESP32 Gateway
// ESP32 devices have SSL/TLS limitations, so this endpoint accepts plain HTTP
// and stores the data in memory (shared with main ingest.js)
//
// Endpoint: /api/ingest-http-bridge
// Method: POST (for ESP32) or GET (for frontend to retrieve latest reading)

let latestReading = null;
let lastUpdateTime = null;

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET request - return latest reading (for frontend polling)
  if (req.method === 'GET') {
    if (!latestReading || !lastUpdateTime) {
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

    // Check if reading is recent (within last 5 minutes)
    const age = Date.now() - lastUpdateTime;
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (age < maxAge) {
      return res.status(200).json({
        ok: true,
        hasReading: true,
        reading: latestReading,
        timestamp: new Date(lastUpdateTime).toISOString(),
        age: Math.round(age / 1000) // age in seconds
      });
    } else {
      // Reading is too old
      return res.status(200).json({
        ok: true,
        hasReading: false,
        message: 'No recent reading available',
        lastReading: latestReading,
        lastUpdate: new Date(lastUpdateTime).toISOString()
      });
    }
  }

  // Handle POST request - accept data from ESP32 Gateway
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const m = req.body;
  
  // Validate payload - accept format from ESP32 Gateway
  // Expected format: { device_id: "AA:BB:CC:DD:EE:FF", temperature: 23.5, humidity: 45.2, co2: 420 }
  // Also accept: { mac: "AA:BB:CC:DD:EE:FF", temperature: 23.5, humidity: 45.2, co2: 420 }
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
  latestReading = {
    mac: m.mac || m.device_id || null,
    device_id: m.device_id || m.mac || null,
    temperature: m.temperature,
    co2: m.co2,
    humidity: m.humidity,
    ts: Date.now(),
  };
  lastUpdateTime = Date.now();

  console.log('INGEST (via HTTP bridge):', latestReading);
  console.log('Received from device:', latestReading.device_id || latestReading.mac || 'unknown');

  return res.status(200).json({ 
    ok: true, 
    message: 'Data received via HTTP bridge',
    reading: latestReading,
    note: 'This endpoint accepts HTTP for ESP32 compatibility'
  });
}

