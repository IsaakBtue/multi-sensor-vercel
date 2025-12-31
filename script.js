// Data storage per device
const deviceData = {}; // { deviceId: { temperature: [], co2: [], humidity: [], labels: [] } }
const labels = []; // Shared time labels across all devices

const co2AlertThreshold = 800;

// Color palette for different devices
const deviceColors = [
    'rgb(75, 192, 192)',   // Teal
    'rgb(255, 99, 132)',   // Red
    'rgb(134, 222, 183)',  // Green
    'rgb(255, 159, 64)',   // Orange
    'rgb(153, 102, 255)',  // Purple
    'rgb(54, 162, 235)',   // Blue
    'rgb(255, 205, 86)',   // Yellow
    'rgb(201, 203, 207)'   // Grey
];

function getDeviceColor(deviceId) {
    const index = whitelistedDevices.indexOf(deviceId);
    return deviceColors[index % deviceColors.length];
}

function initializeDeviceData(deviceId) {
    if (!deviceData[deviceId]) {
        deviceData[deviceId] = {
            temperature: [],
            co2: [],
            humidity: [],
            lastUpdate: null
        };
    }
}

// Device whitelist management
let whitelistedDevices = JSON.parse(localStorage.getItem('whitelistedDevices') || '[]');
let pendingDevice = null;
let promptedDevices = new Set(JSON.parse(localStorage.getItem('promptedDevices') || '[]'));

// Whitelist modal elements
const whitelistModal = document.getElementById('whitelist-modal');
const whitelistCloseBtn = document.getElementById('whitelist-close-btn');
const whitelistYesBtn = document.getElementById('whitelist-yes-btn');
const whitelistNoBtn = document.getElementById('whitelist-no-btn');
const whitelistDeviceInfo = document.getElementById('whitelist-device-info');

// Check if modal elements exist
if (!whitelistModal || !whitelistCloseBtn || !whitelistYesBtn || !whitelistNoBtn || !whitelistDeviceInfo) {
    console.error('Whitelist modal elements not found! Check HTML structure.');
}

// Add function to clear whitelist for testing (can be called from browser console)
window.clearWhitelist = function() {
    whitelistedDevices = [];
    promptedDevices.clear();
    localStorage.removeItem('whitelistedDevices');
    localStorage.removeItem('promptedDevices');
    console.log('Whitelist cleared! Refresh the page and send data again.');
};

const tempCtx = document.getElementById('temperature-chart').getContext('2d');
const co2Ctx = document.getElementById('co2-chart').getContext('2d');
const humidityCanvas = document.getElementById('humidity-chart');
const humidityCtx = humidityCanvas ? humidityCanvas.getContext('2d') : null;
const batteryAlert = document.getElementById('low-battery-alert');

const addDeviceModal = document.getElementById('add-device-modal');
const addDeviceBtn = document.getElementById('add-device-btn');
const closeModalBtn = document.querySelector('.close-button');
const saveDeviceBtn = document.getElementById('save-device-btn');
const deviceCodeInput = document.getElementById('device-code-input');
const modalMessage = document.getElementById('modal-message');
const buildingGrid = document.getElementById('buildingGrid');
const statusSummary = document.getElementById('statusSummary');
const relativeDistances = document.getElementById('relativeDistances');
const humidityValueEl = document.getElementById('humidity-value');
const co2Card = document.getElementById('co2-card');
let currentSensors = [];
let selectedSensorName = null;

// Function to update chart datasets based on whitelisted devices
function updateChartDatasets(chart, dataType) {
    const datasets = whitelistedDevices.map(deviceId => {
        initializeDeviceData(deviceId);
        const device = deviceData[deviceId];
        const deviceDataArray = device[dataType] || [];
        
        // Ensure data array matches labels length
        const alignedData = [];
        for (let i = 0; i < labels.length; i++) {
            alignedData.push(deviceDataArray[i] !== undefined ? deviceDataArray[i] : null);
        }
        
        return {
            label: `${deviceId}`,
            data: alignedData,
            borderColor: getDeviceColor(deviceId),
            tension: 0.1,
            fill: false,
            spanGaps: true // Allow gaps in data
        };
    });
    
    chart.data.datasets = datasets;
    chart.data.labels = labels;
}

const tempChart = new Chart(tempCtx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: []
    },
    options: {
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Temperature (°C)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Time'
                }
            }
        }
    }
});

const co2Chart = new Chart(co2Ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: []
    },
    options: {
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'CO₂ Level (ppm)'
                }
            }
        }
    }
});

const humidityChart = humidityCtx ? new Chart(humidityCtx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: []
    },
    options: {
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Humidity (%)'
                },
                suggestedMin: 30,
                suggestedMax: 70
            }
        }
    }
}) : null;

function isBatteryLow() {
    return Math.random() < 0.1; 
}

function isDeviceWhitelisted(deviceId) {
    if (!deviceId) return false;
    return whitelistedDevices.includes(deviceId);
}

function addDeviceToWhitelist(deviceId) {
    if (deviceId && !whitelistedDevices.includes(deviceId)) {
        whitelistedDevices.push(deviceId);
        localStorage.setItem('whitelistedDevices', JSON.stringify(whitelistedDevices));
        initializeDeviceData(deviceId);
        console.log(`Device ${deviceId} added to whitelist`);
        return true;
    }
    return false;
}

// Allow users to manually whitelist devices (for testing or if they missed the popup)
function removeFromPrompted(deviceId) {
    promptedDevices.delete(deviceId);
    localStorage.setItem('promptedDevices', JSON.stringify(Array.from(promptedDevices)));
}

function showWhitelistPopup(deviceId) {
    if (!deviceId) {
        console.log('showWhitelistPopup called with no deviceId');
        return;
    }
    
    // Check if modal elements exist
    if (!whitelistModal || !whitelistDeviceInfo) {
        console.error('Whitelist modal elements not found!');
        return;
    }
    
    // Only show popup if we haven't prompted about this device before
    if (promptedDevices.has(deviceId)) {
        console.log(`Already prompted about device ${deviceId}, skipping popup`);
        return;
    }
    
    console.log(`Displaying whitelist popup for device: ${deviceId}`);
    pendingDevice = deviceId;
    promptedDevices.add(deviceId);
    localStorage.setItem('promptedDevices', JSON.stringify(Array.from(promptedDevices)));
    whitelistDeviceInfo.textContent = `Device ID: ${deviceId}`;
    whitelistModal.classList.remove('hidden');
    console.log('Whitelist modal should now be visible');
    
    // Force modal to be visible (in case CSS is hiding it)
    whitelistModal.style.display = 'flex';
}

function closeWhitelistModal() {
    whitelistModal.classList.add('hidden');
    pendingDevice = null;
}

// Whitelist modal event handlers (only if elements exist)
if (whitelistYesBtn && whitelistNoBtn && whitelistCloseBtn && whitelistModal) {
    whitelistYesBtn.addEventListener('click', () => {
        if (pendingDevice) {
            console.log(`User clicked Yes - whitelisting device: ${pendingDevice}`);
            if (addDeviceToWhitelist(pendingDevice)) {
                addEvent('device_added', `Device ${pendingDevice} was whitelisted via popup`, pendingDevice);
            }
            closeWhitelistModal();
            // Immediately refresh dashboard to show data from newly whitelisted device
            updateAllCharts();
            setTimeout(() => updateDashboard(), 100);
        }
    });

    whitelistNoBtn.addEventListener('click', () => {
        console.log(`User clicked No - NOT whitelisting device: ${pendingDevice}`);
        addEvent('device_rejected', `Device ${pendingDevice} was rejected`, pendingDevice);
        closeWhitelistModal();
    });

    whitelistCloseBtn.addEventListener('click', () => {
        console.log(`User closed popup - NOT whitelisting device: ${pendingDevice}`);
        addEvent('device_rejected', `Device ${pendingDevice} popup was closed`, pendingDevice);
        closeWhitelistModal();
    });

    window.addEventListener('click', (event) => {
        if (event.target === whitelistModal) {
            closeWhitelistModal();
        }
    });
} else {
    console.error('Cannot set up whitelist modal event handlers - elements missing');
}

// Enable All Devices button
const enableAllDevicesBtn = document.getElementById('enable-all-devices-btn');
if (enableAllDevicesBtn) {
    enableAllDevicesBtn.addEventListener('click', async () => {
        // Get all devices that have sent data but aren't whitelisted
        const allKnownDevices = new Set();
        
        // Check localStorage for any stored device IDs from events
        const storedEvents = JSON.parse(localStorage.getItem('deviceEvents') || '[]');
        storedEvents.forEach(event => {
            if (event.deviceId) {
                allKnownDevices.add(event.deviceId);
            }
        });
        
        // Also check prompted devices
        promptedDevices.forEach(deviceId => {
            allKnownDevices.add(deviceId);
        });
        
        // Check current API for any device sending data
        try {
            const endpoints = ['/api/ingest-http-bridge', '/api/ingest'];
            for (const apiUrl of endpoints) {
                const response = await fetch(apiUrl + '?t=' + Date.now(), {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.ok && data.hasReading && data.reading) {
                        const deviceId = data.reading.device_id || data.reading.mac;
                        if (deviceId) {
                            allKnownDevices.add(deviceId);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking for devices:', error);
        }
        
        let addedCount = 0;
        allKnownDevices.forEach(deviceId => {
            if (!isDeviceWhitelisted(deviceId)) {
                if (addDeviceToWhitelist(deviceId)) {
                    addEvent('device_added', `Device ${deviceId} was auto-whitelisted via "Enable All Devices"`, deviceId);
                    addedCount++;
                }
            }
        });
        
        if (addedCount > 0) {
            alert(`Enabled ${addedCount} device(s). All devices are now whitelisted.`);
            updateAllCharts();
            // Refresh dashboard
            setTimeout(() => updateDashboard(), 100);
        } else {
            alert('No new devices to enable. All known devices are already whitelisted.');
        }
    });
}

async function getSensorData() {
    // Try HTTP bridge endpoint first (where ESP32 gateway sends data)
    const endpoints = ['/api/ingest-http-bridge', '/api/ingest'];
    
    for (const apiUrl of endpoints) {
        try {
            const response = await fetch(apiUrl + '?t=' + Date.now(), {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            if (!response.ok) {
                continue; // Try next endpoint
            }
            const data = await response.json();

            console.log(`API Response from ${apiUrl}:`, data);

            if (!data.ok || !data.hasReading || !data.reading) {
                continue; // Try next endpoint
            }

            const reading = data.reading;
            const deviceId = reading.device_id || reading.mac;
            
            console.log(`Checking device: ${deviceId}, Whitelisted: ${isDeviceWhitelisted(deviceId)}, Whitelist array:`, whitelistedDevices);
            
            // Check if device is whitelisted
            if (deviceId && !isDeviceWhitelisted(deviceId)) {
                console.log(`Device ${deviceId} is NOT whitelisted - showing popup`);
                // Show whitelist popup if not already shown for this device
                if (!promptedDevices.has(deviceId)) {
                    console.log(`Showing whitelist popup for device: ${deviceId}`);
                    showWhitelistPopup(deviceId);
                } else {
                    console.log(`Already prompted about device ${deviceId}, not showing popup again`);
                }
                // Don't return data if device is not whitelisted
                console.log(`Device ${deviceId} is not whitelisted, ignoring data and NOT updating graphs`);
                return null;
            }
            
            if (!deviceId) {
                console.log('Warning: No device_id or mac found in reading');
            }

            const { temperature, co2, humidity } = reading;
            
            console.log(`Received sensor data from whitelisted device ${deviceId} - Temp: ${temperature}°C, CO2: ${co2}ppm, Humidity: ${humidity}%`);

            return {
                deviceId: deviceId,
                temperature: `${temperature.toFixed(1)} °C`,
                humidity: `${humidity.toFixed(1)} %`,
                co2: `${co2.toFixed(0)} ppm`,
                rawTemp: temperature,
                rawCo2: co2,
                rawHumidity: humidity
            };
        } catch (error) {
            console.error(`Error fetching from ${apiUrl}:`, error);
            continue;
        }
    }
    
    // If all endpoints failed or returned no data
    return null;
        } catch (error) {
            console.error(`Error fetching from ${apiUrl}:`, error);
            continue; // Try next endpoint
        }
    }
    
    // If all endpoints failed or returned no data
    console.log('No reading available from any endpoint, returning zeros');
    return {
        temperature: '0.0 °C',
        humidity: '0.0 %',
        co2: '0 ppm',
        rawTemp: 0,
        rawCo2: 0,
        rawHumidity: 0
    };
}

// Track last received data per device
const lastReceivedDataPerDevice = {};

async function updateDashboard() {
    const data = await getSensorData();

    // If data is null, device is not whitelisted - don't update dashboard
    if (data === null || !data.deviceId) {
        console.log('updateDashboard: Data is null or no deviceId, skipping dashboard update');
        // Still update charts in case other devices have data
        updateAllCharts();
        return;
    }

    const deviceId = data.deviceId;
    initializeDeviceData(deviceId);
    const device = deviceData[deviceId];
    
    // Check if this is new data for this device
    const lastData = lastReceivedDataPerDevice[deviceId];
    const isNewData = !lastData || 
                     lastData.temperature !== data.rawTemp || 
                     lastData.co2 !== data.rawCo2 || 
                     lastData.humidity !== data.rawHumidity;
    
    if (isNewData && (data.rawTemp !== 0 || data.rawCo2 !== 0 || data.rawHumidity !== 0)) {
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        // Add timestamp to shared labels
        labels.push(timestamp);
        
        // Add data for this device
        device.temperature.push(data.rawTemp);
        device.co2.push(data.rawCo2);
        device.humidity.push(data.rawHumidity);
        
        // For other devices, add null to maintain alignment
        whitelistedDevices.forEach(id => {
            if (id !== deviceId) {
                initializeDeviceData(id);
                const otherDevice = deviceData[id];
                // Pad with null to match length
                while (otherDevice.temperature.length < labels.length - 1) {
                    otherDevice.temperature.push(null);
                    otherDevice.co2.push(null);
                    otherDevice.humidity.push(null);
                }
                // Add null for this timestamp
                otherDevice.temperature.push(null);
                otherDevice.co2.push(null);
                otherDevice.humidity.push(null);
            }
        });
        
        lastReceivedDataPerDevice[deviceId] = {
            temperature: data.rawTemp,
            co2: data.rawCo2,
            humidity: data.rawHumidity,
            timestamp: timestamp
        };
        
        const maxPoints = 20;
        if (labels.length > maxPoints) {
            labels.shift();
            Object.keys(deviceData).forEach(id => {
                if (deviceData[id].temperature.length > 0) {
                    deviceData[id].temperature.shift();
                    deviceData[id].co2.shift();
                    deviceData[id].humidity.shift();
                }
            });
        }
        
        console.log(`✓ New data point added for device ${deviceId} at ${timestamp}`);
    }
    
    // Update all charts
    updateAllCharts();
    
    // Update display values
    updateDisplayValues();
    
    // Battery alert check
    if (isBatteryLow()) {
        batteryAlert.classList.remove('hidden');
    } else {
        batteryAlert.classList.add('hidden');
    }
}

function updateAllCharts() {
    updateChartDatasets(tempChart, 'temperature');
    updateChartDatasets(co2Chart, 'co2');
    if (humidityChart) {
        updateChartDatasets(humidityChart, 'humidity');
    }
    
    tempChart.update('none');
    co2Chart.update('none');
    if (humidityChart) {
        humidityChart.update('none');
    }
}

// Update display values (show latest or average)
function updateDisplayValues() {
    const tempElement = document.getElementById('temperature-value');
    const co2Element = document.getElementById('co2-value');
    
    // Get latest values from all devices
    let latestTemp = null, latestCo2 = null, latestHumidity = null;
    
    for (const deviceId of whitelistedDevices) {
        const device = deviceData[deviceId];
        if (device && device.temperature.length > 0) {
            const lastTemp = device.temperature[device.temperature.length - 1];
            const lastCo2 = device.co2[device.co2.length - 1];
            const lastHumidity = device.humidity[device.humidity.length - 1];
            
            if (lastTemp !== null && (!latestTemp || lastTemp > latestTemp)) {
                latestTemp = lastTemp;
            }
            if (lastCo2 !== null && (!latestCo2 || lastCo2 > latestCo2)) {
                latestCo2 = lastCo2;
            }
            if (lastHumidity !== null && (!latestHumidity || lastHumidity > latestHumidity)) {
                latestHumidity = lastHumidity;
            }
        }
    }
    
    if (tempElement && latestTemp !== null) {
        tempElement.textContent = `${latestTemp.toFixed(1)} °C`;
    }
    
    if (co2Element && latestCo2 !== null) {
        co2Element.textContent = `${latestCo2.toFixed(0)} ppm`;
    }
    
    if (humidityValueEl && latestHumidity !== null) {
        humidityValueEl.textContent = `${latestHumidity.toFixed(1)} %`;
    }
    
    if (latestCo2 !== null && latestCo2 > co2AlertThreshold) {
        co2Card.classList.add('alert');
    } else {
        co2Card.classList.remove('alert');
    }
}

function openModal() {
    addDeviceModal.classList.remove('hidden');
    modalMessage.classList.add('hidden');
    deviceCodeInput.value = '';
}

function closeModal() {
    addDeviceModal.classList.add('hidden');
}

// Event tracking system
let events = JSON.parse(localStorage.getItem('deviceEvents') || '[]');

function addEvent(type, description, deviceId = null) {
    const event = {
        id: Date.now(),
        type: type,
        description: description,
        deviceId: deviceId,
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleString()
    };
    events.unshift(event); // Add to beginning
    // Keep only last 100 events
    if (events.length > 100) {
        events = events.slice(0, 100);
    }
    localStorage.setItem('deviceEvents', JSON.stringify(events));
    console.log('Event added:', event);
    return event;
}

function handleSaveDevice() {
    const code = deviceCodeInput.value.trim();

    if (code) {
        if (isDeviceWhitelisted(code)) {
            modalMessage.textContent = 'Device is already whitelisted.';
            modalMessage.classList.remove('hidden');
            return;
        }
        
        addDeviceToWhitelist(code);
        addEvent('device_added', `Device ${code} was manually added to whitelist`, code);
        initializeDeviceData(code);
        
        console.log(`Manually added device: ${code}`);
        modalMessage.textContent = `Success! Device ${code} added to whitelist.`;
        modalMessage.classList.remove('hidden');
        
        // Update charts
        updateAllCharts();
        
        setTimeout(closeModal, 2000); 

    } else {
        modalMessage.textContent = 'Please enter a device ID.';
        modalMessage.classList.remove('hidden');
    }
}

// Set up event handlers - ensure elements exist
if (addDeviceBtn) {
    addDeviceBtn.addEventListener('click', openModal);
} else {
    console.error('Add Device button not found');
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
}

if (saveDeviceBtn) {
    saveDeviceBtn.addEventListener('click', handleSaveDevice);
}

// View Alerts button (placeholder for now)
const viewAlertsBtns = document.querySelectorAll('.ghost-btn[type="button"]');
viewAlertsBtns.forEach(btn => {
    if (btn.textContent.trim() === 'View Alerts' && !btn.id) {
        btn.addEventListener('click', () => {
            alert('View Alerts feature coming soon!');
        });
    }
});

window.addEventListener('click', (event) => {
    if (event.target === addDeviceModal) {
        closeModal();
    }
});

const cols = 5;
const rows = 10;
const buildingSensors = [];

for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        const sensorNum = row * cols + col + 1;
        const isActive = Math.random() > 0.25;
        const distance = (Math.random() * 20 + 5).toFixed(1);
        
        buildingSensors.push({
            name: `ESP-${String(sensorNum).padStart(2, '0')}`,
            status: isActive ? 'active' : 'inactive',
            distance: parseFloat(distance),
            distanceDisplay: `${distance} m`,
            x: 0,
            y: 0,
        });
    }
}

function calculatePositions() {
    const margin = 1;
    const availableWidth = 100 - (2 * margin);
    const availableHeight = 100 - (2 * margin);
    
    const avgDistance = buildingSensors.reduce((sum, s) => sum + s.distance, 0) / buildingSensors.length;
    const maxDistance = Math.max(...buildingSensors.map(s => s.distance));
    const minDistance = Math.min(...buildingSensors.map(s => s.distance));
    
    const positions = [];
    
    for (let i = 0; i < buildingSensors.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        const baseLeft = margin + (col / (cols - 1)) * availableWidth;
        const baseTop = margin + (row / (rows - 1)) * availableHeight;
        
        const distanceNorm = (buildingSensors[i].distance - minDistance) / (maxDistance - minDistance || 1);
        
        const leftOffset = (Math.random() - 0.5) * 8 + (distanceNorm - 0.5) * 4;
        const topOffset = (Math.random() - 0.5) * 6 + (distanceNorm - 0.5) * 3;
        
        positions.push({
            x: Math.max(margin, Math.min(100 - margin, baseLeft + leftOffset)),
            y: Math.max(margin, Math.min(100 - margin, baseTop + topOffset))
        });
    }
    
    let minX = Math.min(...positions.map(p => p.x));
    let maxX = Math.max(...positions.map(p => p.x));
    let minY = Math.min(...positions.map(p => p.y));
    let maxY = Math.max(...positions.map(p => p.y));
    
    if (maxX === minX) { maxX = minX + 1; }
    if (maxY === minY) { maxY = minY + 1; }
    
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    for (let i = 0; i < positions.length; i++) {
        const normalizedX = ((positions[i].x - minX) / rangeX) * (100 - 2 * margin) + margin;
        const normalizedY = ((positions[i].y - minY) / rangeY) * (100 - 2 * margin) + margin;
        
        buildingSensors[i].left = normalizedX;
        buildingSensors[i].top = normalizedY;
    }
}

calculatePositions();

const buildingLevels = [
    {
        id: 'level-1',
        label: 'Building Floor',
        sensors: buildingSensors
    }
];

function initializeFacilityMap() {
    const level = buildingLevels[0];
    if (level) {
        renderSensors(level.sensors);
        renderSummary(level.sensors);
    }
}

function renderSensors(sensors) {
    currentSensors = sensors;
    selectedSensorName = null;
    buildingGrid.innerHTML = '';
    
    const baseSize = Math.max(8, 24 - (sensors.length * 0.2));
    document.documentElement.style.setProperty('--esp-size', `${baseSize}px`);
    
    sensors.forEach((sensor) => {
        const point = document.createElement('div');
        point.className = 'esp-point';
        point.style.top = `${sensor.top}%`;
        point.style.left = `${sensor.left}%`;
        point.dataset.status = sensor.status === 'active' ? 'active' : 'inactive';
        point.dataset.sensorName = sensor.name;

        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = `${sensor.name} • ${sensor.status === 'active' ? 'Online' : 'Offline'}`;
        point.appendChild(tooltip);

        const distance = document.createElement('span');
        distance.className = 'distance-label';
        point.appendChild(distance);

        point.addEventListener('click', () => handleSensorClick(sensor.name));

        buildingGrid.appendChild(point);
    });
    updateDistanceLabels();
    updateRelativePanel();
}

function renderSummary(sensors) {
    const activeCount = sensors.filter((sensor) => sensor.status === 'active').length;
    const inactiveCount = sensors.length - activeCount;

    statusSummary.innerHTML = `
        <div class="summary-card">
            <span>Active</span>
            <strong>${activeCount}</strong>
        </div>
        <div class="summary-card">
            <span>Offline</span>
            <strong>${inactiveCount}</strong>
        </div>
        <div class="summary-card">
            <span>Total Distance</span>
            <strong>${sumDistances(sensors)}</strong>
        </div>
    `;
}

function sumDistances(sensors) {
    const total = sensors.reduce((sum, sensor) => {
        return Number.isFinite(sensor.distance) ? sum + sensor.distance : sum;
    }, 0);
    return `${total.toFixed(1)} m`;
}

function handleSensorClick(sensorName) {
    selectedSensorName = sensorName;
    document.querySelectorAll('.esp-point').forEach((point) => {
        point.classList.toggle('selected', point.dataset.sensorName === sensorName);
    });
    updateDistanceLabels();
    updateRelativePanel();
}

function updateDistanceLabels() {
    const selected = currentSensors.find((sensor) => sensor.name === selectedSensorName);
    document.querySelectorAll('.distance-label').forEach((label) => {
        label.classList.remove('visible');
        label.textContent = '';
    });
    if (!selected) return;

    currentSensors.forEach((sensor) => {
        const point = buildingGrid.querySelector(`.esp-point[data-sensor-name="${sensor.name}"]`);
        if (!point) return;
        const label = point.querySelector('.distance-label');
        if (!label) return;

        if (sensor.name === selected.name) {
            label.textContent = '0.0 m';
        } else {
            const relative = calculateRelativeDistance(selected, sensor);
            label.textContent = formatMeters(relative);
        }
        label.classList.add('visible');
    });
}

function calculateRelativeDistance(sensorA, sensorB) {
    return (sensorA.distance + sensorB.distance) / 2;
}

function formatMeters(value) {
    return `${value.toFixed(1)} m`;
}

function updateRelativePanel() {
    relativeDistances.innerHTML = '';
    const selected = currentSensors.find((sensor) => sensor.name === selectedSensorName);

    if (!selected) {
        relativeDistances.innerHTML = '<div class="relative-placeholder">Select a sensor on the map to compare.</div>';
        return;
    }

    currentSensors
        .filter((sensor) => sensor.name !== selected.name)
        .map((sensor) => {
            const rawDistance = calculateRelativeDistance(selected, sensor);
            return {
                name: sensor.name,
                value: rawDistance,
                label: formatMeters(rawDistance)
            };
        })
        .sort((a, b) => a.value - b.value)
        .forEach((entry) => {
            const row = document.createElement('div');
            row.className = 'relative-item';
            row.innerHTML = `<span>${entry.name}</span><strong>${entry.label}</strong>`;
            relativeDistances.appendChild(row);
        });
}

// Initialize facility map when DOM is ready
function initializePage() {
    if (buildingGrid && statusSummary && relativeDistances) {
        initializeFacilityMap();
    } else {
        console.warn('Facility map elements not found, retrying...');
        // Retry after a short delay
        setTimeout(() => {
            if (buildingGrid && statusSummary && relativeDistances) {
                initializeFacilityMap();
            }
        }, 100);
    }
    
    // Start polling for sensor data
    const POLL_INTERVAL = 1000;
    setInterval(updateDashboard, POLL_INTERVAL);
    updateDashboard();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // DOM is already ready
    initializePage();
}

