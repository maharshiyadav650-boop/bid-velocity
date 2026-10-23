#!/bin/sh
set -e

echo "=== Starting BidVelocity Platform on Render ==="

GATEWAY_PORT=${PORT:-10000}
echo "Gateway port: ${GATEWAY_PORT}"

# Export PORT for envsubst
export PORT=${GATEWAY_PORT}

# Substitute PORT in nginx.conf.template and start nginx
envsubst '${PORT}' < /app/nginx.conf.template > /etc/nginx/nginx.conf
nginx
echo "Nginx Reverse Proxy running on port ${GATEWAY_PORT}"

# JVM memory tuning for 512MB container (SerialGC + C1 compiler for low footprint)
JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xms32m -Xmx96m -XX:+ExitOnOutOfMemoryError"

# 1. Start Auth Service
echo "1/4 Starting Auth Service on port 8081..."
java ${JVM_OPTS} -Dserver.port=8081 -jar /app/auth-service.jar 2>&1 | sed 's/^/[auth] /' &
AUTH_PID=$!

# Wait for Auth Service to be ready
echo "Waiting for Auth Service to initialize..."
for i in $(seq 1 60); do
    if curl -s http://127.0.0.1:8081/actuator/health | grep -q "UP"; then
        echo "Auth Service is UP and healthy!"
        break
    fi
    sleep 2
done

# 2. Start Auction Service
echo "2/4 Starting Auction Service on port 8082..."
java ${JVM_OPTS} -Dserver.port=8082 -jar /app/auction-service.jar 2>&1 | sed 's/^/[auction] /' &
AUCTION_PID=$!
sleep 8

# 3. Start Bidding Service
echo "3/4 Starting Bidding Service on port 8083..."
java ${JVM_OPTS} -Dserver.port=8083 -jar /app/bidding-service.jar 2>&1 | sed 's/^/[bidding] /' &
BIDDING_PID=$!
sleep 8

# 4. Start Payment Service
echo "4/4 Starting Payment Service on port 8084..."
java ${JVM_OPTS} -Dserver.port=8084 -jar /app/payment-service.jar 2>&1 | sed 's/^/[payment] /' &
PAYMENT_PID=$!

echo "=== All BidVelocity microservices successfully launched! ==="

# Wait and monitor all background processes
wait -n
