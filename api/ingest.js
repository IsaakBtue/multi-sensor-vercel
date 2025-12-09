// Store latest reading in memory (persists during function lifetime)
// Note: In Vercel serverless, this resets between cold starts
let latestReading = null;
let lastUpdateTime = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET request - return latest reading
  if (req.method === 'GET') {
    if (latestReading && lastUpdateTime) {
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
    } else {
      // No reading yet
      return res.status(200).json({
        ok: true,
        hasReading: false,
        message: 'No reading available yet'
      });
    }
  }

  // Handle POST request - store new reading
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

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
}
