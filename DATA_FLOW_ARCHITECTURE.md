# Multi-Sensor Network Data Flow Architecture

## Overview

This document explains how sensor data flows from ESP32 sensor stations through the network to the web server dashboard.

## System Architecture

```
┌─────────────────┐
│  ESP32 Station  │  (Sensor Node)
│  - SCD41 Sensor │  - Reads CO₂, Temperature, Humidity
│  - Battery      │  - Sends data via ESP-NOW
└────────┬────────┘
         │ ESP-NOW (Wireless Protocol)
         │ (No WiFi required, low power)
         ▼
┌─────────────────┐
│  ESP32 Gateway  │  (Bridge Device)
│  - Receives     │  - Listens for ESP-NOW packets
│    ESP-NOW      │  - Connects to WiFi
│  - Forwards     │  - Sends HTTP POST to server
│    via WiFi     │
└────────┬────────┘
         │ WiFi (HTTP POST)
         │ Router/Internet
         ▼
┌─────────────────┐
│  Router/Gateway │  (Your Network)
│  - WiFi Router  │  - Routes traffic to internet
│  - Internet     │  - Provides internet access
│    Connection   │
└────────┬────────┘
         │ Internet (HTTP)
         ▼
┌─────────────────┐
│  Vercel Server  │  (Web Server)
│  - API Endpoint │  - Receives HTTP POST requests
│    /api/        │  - Stores latest reading
│    ingest-http- │  - Serves dashboard
│    bridge       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Web Dashboard  │  (Frontend)
│  - Displays     │  - Polls API for latest data
│    sensor data  │  - Shows charts and graphs
│  - Real-time    │  - Updates every few seconds
│    updates      │
└─────────────────┘
```

## Detailed Data Flow

### Step 1: Sensor Station (ESP32 with SCD41)

**Location:** Physical location where sensors are deployed (e.g., rooms, offices)

**Components:**
- ESP32 microcontroller
- SCD41 sensor (CO₂, temperature, humidity)
- Battery power (optional)

**Process:**
1. ESP32 reads sensor data from SCD41 at regular intervals (e.g., every 30 seconds)
2. Data is formatted into a `sensor_msg` structure:
   ```cpp
   struct sensor_msg {
     float temperature;  // Celsius
     uint16_t co2;       // PPM
     float humidity;     // Percentage
   }
   ```
3. Data is sent via **ESP-NOW** protocol to the gateway's broadcast address (`FF:FF:FF:FF:FF:FF`)
4. ESP-NOW is a peer-to-peer wireless protocol that doesn't require WiFi connection
5. Station goes to sleep to conserve battery power

**Key Features:**
- Low power consumption (ESP-NOW is very efficient)
- No WiFi required on station
- Direct peer-to-peer communication
- Can work up to ~200m range (line of sight)

### Step 2: Gateway (ESP32 Bridge)

**Location:** Central location with WiFi access

**Components:**
- ESP32 microcontroller
- WiFi connection to your router
- ESP-NOW receiver

**Process:**
1. Gateway listens for ESP-NOW packets from all stations
2. When a packet is received:
   - Extracts sensor data (temperature, humidity, CO₂)
   - Records the station's MAC address (device identifier)
   - Records RSSI (signal strength) for diagnostics
3. Gateway connects to your WiFi router using credentials:
   - SSID: Your router's WiFi name
   - Password: Your router's WiFi password
4. Gateway formats data as JSON:
   ```json
   {
     "device_id": "AA:BB:CC:DD:EE:FF",
     "temperature": 23.5,
     "humidity": 45.2,
     "co2": 420
   }
   ```
5. Gateway sends **HTTP POST** request to:
   ```
   http://multisensornetwork.vercel.app/api/ingest-http-bridge
   ```
   - Uses HTTP (not HTTPS) because ESP32 has SSL/TLS limitations
   - The `ingest-http-bridge` endpoint accepts plain HTTP for compatibility

**Key Features:**
- Acts as a bridge between ESP-NOW and WiFi/Internet
- One gateway can receive from multiple stations
- Handles WiFi reconnection automatically
- Forwards data immediately upon receipt

### Step 3: Router/Network

**Location:** Your local network infrastructure

**Components:**
- WiFi router (your purchased router)
- Internet connection (ISP)

**Process:**
1. Router receives WiFi packets from ESP32 Gateway
2. Router routes the HTTP POST request to the internet
3. Request travels through your ISP's network
4. Request reaches Vercel's servers via internet routing

**Key Features:**
- Standard network routing
- No special configuration needed
- Works with any standard WiFi router
- Requires internet connection

### Step 4: Web Server (Vercel)

**Location:** Cloud (Vercel's infrastructure)

**Components:**
- Vercel serverless function: `/api/ingest-http-bridge.js`
- In-memory storage (latest reading per device)

**Process:**
1. Vercel receives HTTP POST request at `/api/ingest-http-bridge`
2. Endpoint validates the JSON payload:
   - Checks for required fields: `temperature`, `humidity`, `co2`
   - Accepts `device_id` or `mac` for device identification
3. Stores the latest reading in memory:
   ```javascript
   latestReading = {
     mac: "AA:BB:CC:DD:EE:FF",
     device_id: "AA:BB:CC:DD:EE:FF",
     temperature: 23.5,
     co2: 420,
     humidity: 45.2,
     ts: 1234567890123  // timestamp
   }
   ```
4. Returns success response:
   ```json
   {
     "ok": true,
     "message": "Data received via HTTP bridge",
     "reading": { ... }
   }
   ```

**Key Features:**
- Accepts HTTP (no SSL required)
- CORS enabled for frontend access
- Stores latest reading per device
- Can be queried via GET request

### Step 5: Web Dashboard (Frontend)

**Location:** User's web browser

**Components:**
- HTML/CSS/JavaScript dashboard
- Chart.js for visualizations
- Polling mechanism

**Process:**
1. Dashboard loads in user's browser
2. JavaScript polls the API endpoint every few seconds:
   ```javascript
   GET /api/ingest-http-bridge
   ```
3. Receives latest sensor reading:
   ```json
   {
     "ok": true,
     "hasReading": true,
     "reading": {
       "temperature": 23.5,
       "co2": 420,
       "humidity": 45.2,
       "ts": 1234567890123
     }
   }
   ```
4. Updates charts and displays:
   - Temperature line chart
   - CO₂ line chart
   - Humidity line chart
   - Current values
   - Alerts if CO₂ exceeds threshold

**Key Features:**
- Real-time updates (polling every 2-5 seconds)
- Visual charts and graphs
- Responsive design
- Multiple device support

## Protocol Details

### ESP-NOW Protocol

- **Type:** Peer-to-peer wireless protocol
- **Range:** ~200m (line of sight)
- **Power:** Very low power consumption
- **Speed:** Fast, low latency
- **Security:** Optional encryption
- **Advantages:**
  - No WiFi infrastructure needed
  - Low power (battery-friendly)
  - Direct device-to-device communication
  - Works even if WiFi is down

### HTTP Protocol

- **Type:** Application layer protocol
- **Method:** POST (for sending data), GET (for retrieving data)
- **Format:** JSON payload
- **Security:** HTTP (not HTTPS) for ESP32 compatibility
- **Port:** 80 (default HTTP port)
- **Headers:**
  ```
  Content-Type: application/json
  ```

## Data Format

### ESP-NOW Message (Binary)
```cpp
struct sensor_msg {
  float temperature;  // 4 bytes
  uint16_t co2;       // 2 bytes
  float humidity;     // 4 bytes
  // Total: 10 bytes
}
```

### HTTP POST Payload (JSON)
```json
{
  "device_id": "AA:BB:CC:DD:EE:FF",
  "temperature": 23.5,
  "humidity": 45.2,
  "co2": 420
}
```

### API Response (JSON)
```json
{
  "ok": true,
  "hasReading": true,
  "reading": {
    "mac": "AA:BB:CC:DD:EE:FF",
    "device_id": "AA:BB:CC:DD:EE:FF",
    "temperature": 23.5,
    "co2": 420,
    "humidity": 45.2,
    "ts": 1234567890123
  },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "age": 5
}
```

## Network Requirements

### Station Requirements
- ✅ ESP32 microcontroller
- ✅ SCD41 sensor
- ✅ Power source (battery or USB)
- ❌ No WiFi connection needed
- ❌ No internet connection needed

### Gateway Requirements
- ✅ ESP32 microcontroller
- ✅ WiFi connection to router
- ✅ Router with internet access
- ✅ Router SSID and password configured

### Router Requirements
- ✅ Standard WiFi router (802.11n or better)
- ✅ Internet connection (ISP)
- ✅ DHCP enabled (for automatic IP assignment)
- ✅ No port forwarding needed (outbound connections)

### Server Requirements
- ✅ Vercel account (free tier works)
- ✅ Deployed serverless functions
- ✅ Public internet access

## Troubleshooting

### Station Not Sending Data
- Check battery level
- Verify ESP-NOW is initialized
- Check gateway MAC address is correct
- Verify sensor is working (check serial output)

### Gateway Not Receiving Data
- Check ESP-NOW initialization
- Verify stations are sending to broadcast address
- Check serial output for received packets
- Verify WiFi is connected

### Gateway Not Forwarding to Server
- Check WiFi connection status
- Verify router has internet access
- Check API endpoint URL is correct
- Verify HTTP POST is successful (check serial output)
- Check for DNS resolution issues

### Server Not Receiving Data
- Check API endpoint is deployed
- Verify endpoint accepts HTTP (not just HTTPS)
- Check CORS headers are set
- Verify JSON payload format
- Check Vercel function logs

### Dashboard Not Updating
- Check browser console for errors
- Verify API endpoint URL is correct
- Check polling interval is set
- Verify GET request returns data
- Check CORS is enabled on server

## Security Considerations

### Current Implementation
- HTTP (not HTTPS) for ESP32 compatibility
- No authentication on API endpoint
- Public endpoint (anyone can send data)
- CORS enabled for all origins

### Recommended Improvements
- Add API key authentication
- Use HTTPS with proper SSL certificates
- Implement rate limiting
- Add device whitelist
- Encrypt ESP-NOW communication
- Add request signing/verification

## Performance Characteristics

### Latency
- ESP-NOW transmission: < 10ms
- WiFi transmission: 50-200ms
- Internet routing: 100-500ms
- Server processing: < 50ms
- **Total:** ~200-750ms from sensor to server

### Throughput
- ESP-NOW: Can handle multiple stations (10+)
- WiFi: Limited by router bandwidth
- Internet: Limited by ISP connection
- Server: Vercel free tier handles moderate traffic

### Power Consumption
- Station (sleeping): < 1mA
- Station (active): ~80mA
- Gateway (idle): ~50mA
- Gateway (transmitting): ~150mA

## Future Enhancements

1. **Persistent Storage:** Store historical data in database
2. **Multiple Gateways:** Support multiple gateways for redundancy
3. **Device Management:** Add device registration and management
4. **Alerting:** Email/SMS notifications for threshold breaches
5. **Data Analytics:** Long-term trend analysis
6. **Mobile App:** Native mobile application
7. **HTTPS Support:** Upgrade to HTTPS with proper certificates
8. **MQTT Protocol:** Add MQTT support for better IoT integration

## References

- [ESP-NOW Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/network/esp_now.html)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [SCD41 Sensor Datasheet](https://sensirion.com/products/catalog/SCD41/)
- [ESP32 WiFi Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/network/esp_wifi.html)

