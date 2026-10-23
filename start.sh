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

# JVM memory tuning for 512MB container
JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss256k -XX:ReservedCodeCacheSize=16m -XX:MaxMetaspaceSize=48m -XX:+ExitOnOutOfMemoryError"

# 1. Start Auth Service
echo "1/4 Starting Auth Service on port 8081..."
java ${JVM_OPTS} -Xms20m -Xmx48m -Dserver.port=8081 -jar /app/auth-service.jar > /tmp/auth.log 2>&1 &
AUTH_PID=$!

# Wait for Auth Service to be ready
echo "Waiting for Auth Service to initialize..."
for i in $(seq 1 45); do
    if curl -s http://127.0.0.1:8081/actuator/health | grep -q "UP"; then
        echo "Auth Service is UP and healthy!"
        break
    fi
    sleep 2
done

# 2. Start Auction Service
echo "2/4 Starting Auction Service on port 8082..."
java ${JVM_OPTS} -Xms20m -Xmx48m -Dserver.port=8082 -jar /app/auction-service.jar > /tmp/auction.log 2>&1 &
AUCTION_PID=$!
sleep 6

# 3. Start Bidding Service
echo "3/4 Starting Bidding Service on port 8083..."
java ${JVM_OPTS} -Xms20m -Xmx48m -Dserver.port=8083 -jar /app/bidding-service.jar > /tmp/bidding.log 2>&1 &
BIDDING_PID=$!
sleep 6

# 4. Start Payment Service
echo "4/4 Starting Payment Service on port 8084..."
java ${JVM_OPTS} -Xms20m -Xmx48m -Dserver.port=8084 -jar /app/payment-service.jar > /tmp/payment.log 2>&1 &
PAYMENT_PID=$!

echo "=== All BidVelocity microservices successfully launched! ==="

# Monitor processes
while true; do
    if ! kill -0 $AUTH_PID 2>/dev/null; then
        echo "ERROR: Auth Service exited unexpectedly!"
        cat /tmp/auth.log
        exit 1
    fi
    if ! kill -0 $AUCTION_PID 2>/dev/null; then
        echo "ERROR: Auction Service exited unexpectedly!"
        cat /tmp/auction.log
        exit 1
    fi
    if ! kill -0 $BIDDING_PID 2>/dev/null; then
        echo "ERROR: Bidding Service exited unexpectedly!"
        cat /tmp/bidding.log
        exit 1
    fi
    if ! kill -0 $PAYMENT_PID 2>/dev/null; then
        echo "ERROR: Payment Service exited unexpectedly!"
        cat /tmp/payment.log
        exit 1
    fi
    sleep 15
done
