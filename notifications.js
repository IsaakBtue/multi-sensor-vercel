// Load and display whitelisted devices
function loadWhitelistedDevices() {
    const whitelistedDevices = JSON.parse(localStorage.getItem('whitelistedDevices') || '[]');
    const container = document.getElementById('whitelisted-devices-list');
    
    if (whitelistedDevices.length === 0) {
        container.innerHTML = '<p style="color: rgba(15, 23, 42, 0.6);">No devices whitelisted yet.</p>';
        return;
    }
    
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '12px';
    
    whitelistedDevices.forEach(deviceId => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '12px 16px';
        item.style.background = 'rgba(173, 238, 227, 0.2)';
        item.style.borderRadius = '8px';
        item.style.border = '1px solid rgba(173, 238, 227, 0.4)';
        
        const deviceInfo = document.createElement('div');
        deviceInfo.innerHTML = `
            <strong style="color: var(--ink);">${deviceId}</strong>
            <p style="margin: 4px 0 0; font-size: 0.9em; color: rgba(15, 23, 42, 0.7);">Whitelisted Device</p>
        `;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'ghost-btn';
        removeBtn.style.color = '#d97706';
        removeBtn.style.padding = '6px 12px';
        removeBtn.style.fontSize = '0.9em';
        removeBtn.onclick = () => removeDevice(deviceId);
        
        item.appendChild(deviceInfo);
        item.appendChild(removeBtn);
        list.appendChild(item);
    });
    
    container.innerHTML = '';
    container.appendChild(list);
}

function removeDevice(deviceId) {
    if (confirm(`Are you sure you want to remove device ${deviceId} from the whitelist?`)) {
        let whitelistedDevices = JSON.parse(localStorage.getItem('whitelistedDevices') || '[]');
        whitelistedDevices = whitelistedDevices.filter(id => id !== deviceId);
        localStorage.setItem('whitelistedDevices', JSON.stringify(whitelistedDevices));
        
        // Add event
        const events = JSON.parse(localStorage.getItem('deviceEvents') || '[]');
        events.unshift({
            id: Date.now(),
            type: 'device_removed',
            description: `Device ${deviceId} was removed from whitelist`,
            deviceId: deviceId,
            timestamp: new Date().toISOString(),
            displayTime: new Date().toLocaleString()
        });
        if (events.length > 100) events.splice(100);
        localStorage.setItem('deviceEvents', JSON.stringify(events));
        
        loadWhitelistedDevices();
        loadEventLog();
    }
}

// Load and display event log
function loadEventLog() {
    const events = JSON.parse(localStorage.getItem('deviceEvents') || '[]');
    const container = document.getElementById('event-log');
    
    if (events.length === 0) {
        container.innerHTML = '<p style="color: rgba(15, 23, 42, 0.6);">No events yet.</p>';
        return;
    }
    
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '12px';
    
    events.forEach(event => {
        const item = document.createElement('div');
        item.style.padding = '12px 16px';
        item.style.background = getEventColor(event.type);
        item.style.borderRadius = '8px';
        item.style.border = '1px solid rgba(15, 23, 42, 0.1)';
        
        const icon = getEventIcon(event.type);
        const typeLabel = getEventTypeLabel(event.type);
        
        item.innerHTML = `
            <div style="display: flex; align-items: start; gap: 12px;">
                <span style="font-size: 1.2em;">${icon}</span>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong style="color: var(--ink);">${typeLabel}</strong>
                            <p style="margin: 4px 0 0; color: rgba(15, 23, 42, 0.7); font-size: 0.9em;">${event.description}</p>
                        </div>
                        <span style="font-size: 0.85em; color: rgba(15, 23, 42, 0.6); white-space: nowrap; margin-left: 12px;">${event.displayTime}</span>
                    </div>
                    ${event.deviceId ? `<p style="margin: 4px 0 0; font-size: 0.85em; color: rgba(15, 23, 42, 0.6);">Device: ${event.deviceId}</p>` : ''}
                </div>
            </div>
        `;
        
        list.appendChild(item);
    });
    
    container.innerHTML = '';
    container.appendChild(list);
}

function getEventColor(type) {
    switch(type) {
        case 'device_added':
            return 'rgba(134, 222, 183, 0.2)';
        case 'device_removed':
            return 'rgba(255, 99, 132, 0.2)';
        case 'device_rejected':
            return 'rgba(255, 159, 64, 0.2)';
        default:
            return 'rgba(173, 238, 227, 0.2)';
    }
}

function getEventIcon(type) {
    switch(type) {
        case 'device_added':
            return '✅';
        case 'device_removed':
            return '❌';
        case 'device_rejected':
            return '⚠️';
        default:
            return '📋';
    }
}

function getEventTypeLabel(type) {
    switch(type) {
        case 'device_added':
            return 'Device Added';
        case 'device_removed':
            return 'Device Removed';
        case 'device_rejected':
            return 'Device Rejected';
        default:
            return 'Event';
    }
}

// Clear whitelist button
document.getElementById('clear-whitelist-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all whitelisted devices? This cannot be undone.')) {
        localStorage.removeItem('whitelistedDevices');
        const events = JSON.parse(localStorage.getItem('deviceEvents') || '[]');
        events.unshift({
            id: Date.now(),
            type: 'system',
            description: 'All devices were removed from whitelist',
            deviceId: null,
            timestamp: new Date().toISOString(),
            displayTime: new Date().toLocaleString()
        });
        if (events.length > 100) events.splice(100);
        localStorage.setItem('deviceEvents', JSON.stringify(events));
        loadWhitelistedDevices();
        loadEventLog();
    }
});

// Clear events button
document.getElementById('clear-events-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the event log? This cannot be undone.')) {
        localStorage.removeItem('deviceEvents');
        loadEventLog();
    }
});

// Load data on page load
loadWhitelistedDevices();
loadEventLog();

// Refresh every 5 seconds to catch new events
setInterval(() => {
    loadWhitelistedDevices();
    loadEventLog();
}, 5000);

