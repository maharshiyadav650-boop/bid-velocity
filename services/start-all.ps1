# start-all.ps1
$servicesDir = $PSScriptRoot
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^\s*([^#=]+)=(.*)$' } | ForEach-Object {
        $k = $matches[1].Trim()
        $v = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
}

Write-Host "Starting microservices from $servicesDir..."
Write-Host "Make sure you have Java and Maven installed and in your PATH."

# Database configuration (defaults to .env values if set)
if (-not $env:DB_USERNAME) { $env:DB_USERNAME = "bvadmin" }
if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = "trust-local-no-password" }
if (-not $env:DB_PORT) { $env:DB_PORT = "5432" }

# 1. Start Eureka Server
Write-Host "Starting Eureka Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:DB_USERNAME='$env:DB_USERNAME'; `$env:DB_PASSWORD='$env:DB_PASSWORD'; cd '$servicesDir\eureka-server'; mvn spring-boot:run"

# Wait a bit for Eureka to start
Start-Sleep -Seconds 15

# 2. Start API Gateway
Write-Host "Starting API Gateway..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:DB_USERNAME='$env:DB_USERNAME'; `$env:DB_PASSWORD='$env:DB_PASSWORD'; cd '$servicesDir\api-gateway'; mvn spring-boot:run"

Start-Sleep -Seconds 10

# 3. Start remaining services
$services = @("auth-service", "auction-service", "bidding-service", "payment-service")

foreach ($service in $services) {
    Write-Host "Starting $service..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:DB_USERNAME='$env:DB_USERNAME'; `$env:DB_PASSWORD='$env:DB_PASSWORD'; cd '$servicesDir\$service'; mvn spring-boot:run"
    Start-Sleep -Seconds 5
}

Write-Host "All services have been launched in separate windows!"
Write-Host "Check http://localhost:8761 in your browser to verify they register successfully."
