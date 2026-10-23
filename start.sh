#!/bin/sh
set -e

echo "=== Starting BidVelocity Platform on Render ==="

GATEWAY_PORT=${PORT:-10000}
echo "Gateway port: ${GATEWAY_PORT}"

export PORT=${GATEWAY_PORT}
envsubst '${PORT}' < /app/nginx.conf.template > /etc/nginx/nginx.conf
nginx
echo "Nginx Reverse Proxy running on port ${GATEWAY_PORT}"

# Base JVM flags: SerialGC + C1 compiler for minimal resident memory
BASE_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=55m -XX:+ExitOnOutOfMemoryError"

# 1. Start Auth Service (essential for login and signup!)
echo "1/4 Starting Auth Service on port 8081..."
java ${BASE_OPTS} -Xms20m -Xmx40m -Dserver.port=8081 -jar /app/auth-service.jar &
AUTH_PID=$!

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
java ${BASE_OPTS} -Xms16m -Xmx32m -Dserver.port=8082 -jar /app/auction-service.jar &
AUCTION_PID=$!

echo "Waiting for Auction Service to initialize..."
for i in $(seq 1 45); do
    if curl -s http://127.0.0.1:8082/actuator/health | grep -q "UP"; then
        echo "Auction Service is UP and healthy!"
        break
    fi
    sleep 2
done

# 3. Start Bidding Service
echo "3/4 Starting Bidding Service on port 8083..."
java ${BASE_OPTS} -Xms16m -Xmx32m -Dserver.port=8083 -jar /app/bidding-service.jar &
BIDDING_PID=$!

echo "Waiting for Bidding Service to initialize..."
for i in $(seq 1 45); do
    if curl -s http://127.0.0.1:8083/actuator/health | grep -q "UP"; then
        echo "Bidding Service is UP and healthy!"
        break
    fi
    sleep 2
done

# 4. Start Payment Service
echo "4/4 Starting Payment Service on port 8084..."
java ${BASE_OPTS} -Xms16m -Xmx28m -Dserver.port=8084 -jar /app/payment-service.jar &
PAYMENT_PID=$!

echo "=== All BidVelocity microservices successfully launched! ==="

wait
