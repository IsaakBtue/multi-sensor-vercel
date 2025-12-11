# PowerShell script to test the ingest-http-bridge endpoint
# This simulates data from an ESP32 gateway

$url = "https://multi-sensor-vercel.vercel.app/api/ingest-http-bridge"

# Sample sensor data (similar to what ESP32 gateway would send)
$body = @{
    device_id = "AA:BB:CC:DD:EE:FF"
    temperature = 23.5
    humidity = 45.2
    co2 = 420
} | ConvertTo-Json

Write-Host "Sending POST request to: $url" -ForegroundColor Cyan
Write-Host "Payload: $body" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    
    Write-Host "✓ SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content
    
    Write-Host ""
    Write-Host "Now check the dashboard at: https://multi-sensor-vercel.vercel.app/" -ForegroundColor Cyan
    Write-Host "The data should appear within a few seconds!" -ForegroundColor Cyan
} catch {
    Write-Host "✗ ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

