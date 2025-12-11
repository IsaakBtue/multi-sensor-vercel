const temperatureData = [];
const co2Data = [];
const humidityData = [];
const labels = [];

const co2AlertThreshold = 800;

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
const roomNameInput = document.getElementById('room-name-input');
const modalMessage = document.getElementById('modal-message');
const buildingGrid = document.getElementById('buildingGrid');
const statusSummary = document.getElementById('statusSummary');
const relativeDistances = document.getElementById('relativeDistances');
const humidityValueEl = document.getElementById('humidity-value');
const co2Card = document.getElementById('co2-card');
let currentSensors = [];
let selectedSensorName = null;

const tempChart = new Chart(tempCtx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'Temperature (°C)',
            data: temperatureData,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    },
    options: {
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
        datasets: [{
            label: 'CO₂ Level (ppm)',
            data: co2Data,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1
        }]
    },
    options: {
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
        datasets: [{
            label: 'Humidity (%)',
            data: humidityData,
            borderColor: 'rgb(134, 222, 183)',
            tension: 0.2
        }]
    },
    options: {
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

            const { temperature, co2, humidity } = data.reading;
            
            console.log(`Received sensor data - Temp: ${temperature}°C, CO2: ${co2}ppm, Humidity: ${humidity}%`);

            return {
                temperature: `${temperature.toFixed(1)} °C`,
                humidity: `${humidity.toFixed(1)} %`,
                co2: `${co2.toFixed(0)} ppm`,
                rawTemp: temperature,
                rawCo2: co2,
                rawHumidity: humidity
            };
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

async function updateDashboard() {
    const data = await getSensorData();

    console.log('Updating dashboard with:', data);

    const tempElement = document.getElementById('temperature-value');
    const co2Element = document.getElementById('co2-value');
    
    if (tempElement) {
        tempElement.textContent = data.temperature;
        console.log(`Temperature display updated to: ${data.temperature}`);
    }
    
    if (co2Element) {
        co2Element.textContent = data.co2;
    }
    
    if (humidityValueEl) {
        humidityValueEl.textContent = data.humidity;
    }

    if (data.rawCo2 > co2AlertThreshold) {
        co2Card.classList.add('alert');
    } else {
        co2Card.classList.remove('alert');
    }

    if (isBatteryLow()) {
        batteryAlert.classList.remove('hidden');
    } else {
        batteryAlert.classList.add('hidden');
    }

    if (data.rawTemp !== null && data.rawCo2 !== null && data.rawHumidity !== null) {
        const isRealData = data.rawTemp !== 0 || data.rawCo2 !== 0 || data.rawHumidity !== 0;
        
        const isNewData = lastReceivedData.temperature !== data.rawTemp || 
                         lastReceivedData.co2 !== data.rawCo2 || 
                         lastReceivedData.humidity !== data.rawHumidity;
        
        if (isRealData && isNewData) {
            temperatureData.push(data.rawTemp);
            co2Data.push(data.rawCo2);
            humidityData.push(data.rawHumidity);

            const now = new Date();
            const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            labels.push(timestamp);

            lastReceivedData = {
                temperature: data.rawTemp,
                co2: data.rawCo2,
                humidity: data.rawHumidity,
                timestamp: timestamp
            };

            const maxPoints = 20;
            if (labels.length > maxPoints) {
                temperatureData.shift();
                co2Data.shift();
                humidityData.shift();
                labels.shift();
            }

            tempChart.update('none');
            co2Chart.update('none');
            if (humidityChart) {
                humidityChart.update('none');
            }
            
            console.log(`✓ New data point added to graphs at ${timestamp} - Temp: ${data.rawTemp}°C, CO2: ${data.rawCo2}ppm, Humidity: ${data.rawHumidity}%`);
        } else if (!isRealData) {
            console.log('No real sensor data yet (zeros received), graphs not updated');
        } else if (!isNewData) {
        }
    }
}

function openModal() {
    addDeviceModal.classList.remove('hidden');
    modalMessage.classList.add('hidden');
    deviceCodeInput.value = '';
    roomNameInput.value = '';
}

function closeModal() {
    addDeviceModal.classList.add('hidden');
}

function handleSaveDevice() {
    const code = deviceCodeInput.value.trim();
    const roomName = roomNameInput.value.trim();

    if (code && roomName) {
        console.log(`Saving new device: Code=${code}, Room=${roomName}`);
        modalMessage.textContent = `✅ Success! Device ${code} added for ${roomName}.`;
        modalMessage.classList.remove('hidden');
        
        setTimeout(closeModal, 2000); 

    } else {
        modalMessage.textContent = '❌ Please enter both a device code and a room name.';
        modalMessage.classList.remove('hidden');
    }
}

addDeviceBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
saveDeviceBtn.addEventListener('click', handleSaveDevice);

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

if (buildingGrid && statusSummary && relativeDistances) {
    initializeFacilityMap();
}

let lastReceivedData = {
    temperature: null,
    co2: null,
    humidity: null,
    timestamp: null
};

const POLL_INTERVAL = 1000;
setInterval(updateDashboard, POLL_INTERVAL);

updateDashboard();

