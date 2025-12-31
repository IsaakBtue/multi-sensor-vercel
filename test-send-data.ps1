# PowerShell script to send 10 pieces of sensor data every 1 second
# Usage: .\test-send-data.ps1

$uri = "https://multi-sensor-vercel.vercel.app/api/ingest-http-bridge"
$deviceId = "AA:BB:CC:DD:EE:FE"

Write-Host "Starting to send 10 data points every 1 second..." -ForegroundColor Green
Write-Host "Device ID: $deviceId" -ForegroundColor Cyan
Write-Host ""

# Random number generator for varying sensor values
$random = New-Object System.Random

for ($i = 1; $i -le 10; $i++) {
    # Generate random sensor values within reasonable ranges
    $temperature = [math]::Round($random.NextDouble() * 10 + 20, 1)  # 20-30 C
    $humidity = [math]::Round($random.NextDouble() * 30 + 40, 1)      # 40-70%
    $co2 = $random.Next(400, 600)                                     # 400-600 ppm
    
    $body = @{
        device_id = $deviceId
        temperature = $temperature
        humidity = $humidity
        co2 = $co2
    } | ConvertTo-Json
    
    Write-Host "[$i/10] Sending data - Temp: $temperature C, Humidity: $humidity%, CO2: $co2 ppm" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] Success!" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Unexpected status: $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Wait 1 second before next request (except after the last one)
    if ($i -lt 10) {
        Start-Sleep -Seconds 1
    }
}

Write-Host ""
Write-Host "Completed sending 10 data points!" -ForegroundColor Green

