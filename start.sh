#!/bin/sh
set -e

echo "=== Starting BidVelocity Platform on Render ==="

GATEWAY_PORT=${PORT:-10000}
echo "Gateway port: ${GATEWAY_PORT}"

export PORT=${GATEWAY_PORT}
envsubst '${PORT}' < /app/nginx.conf.template > /etc/nginx/nginx.conf
nginx
echo "Nginx Reverse Proxy running on port ${GATEWAY_PORT}"

BASE_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:ReservedCodeCacheSize=28m -XX:CICompilerCount=2 -Xss512k -XX:MaxMetaspaceSize=115m -Dserver.tomcat.threads.max=15 -Dserver.tomcat.threads.min-spare=2"

# Real-time memory monitor for Render free tier diagnostics
while true; do
    echo "=== Memory Usage at $(date) ===" > /tmp/memory.txt
    free -m >> /tmp/memory.txt 2>/dev/null || true
    echo "" >> /tmp/memory.txt
    echo "=== Top Processes ===" >> /tmp/memory.txt
    ps aux --sort=-%mem | head -n 10 >> /tmp/memory.txt 2>/dev/null || true
    sleep 30
done &

# 1. Start Auth Service (essential for login and signup!)
echo "1/2 Starting Auth Service on port 8081..."
java ${BASE_OPTS} -Xms20m -Xmx40m -Dserver.port=8081 -jar /app/auth-service.jar > /tmp/auth.log 2>&1 &
AUTH_PID=$!

echo "Waiting for Auth Service to initialize..."
AUTH_UP=0
for i in $(seq 1 120); do
    if curl -s http://127.0.0.1:8081/actuator/health | grep -q "UP"; then
        echo "Auth Service is UP and healthy!"
        AUTH_UP=1
        break
    fi
    sleep 2
done

# 2. Start Auction Service (only after Auth Service is fully settled)
if [ $AUTH_UP -eq 1 ]; then
    echo "2/2 Starting Auction Service on port 8082..."
    java ${BASE_OPTS} -Xms20m -Xmx40m -Dserver.port=8082 -jar /app/auction-service.jar > /tmp/auction.log 2>&1 &
    AUCTION_PID=$!

    echo "Waiting for Auction Service to initialize..."
    for i in $(seq 1 120); do
        if curl -s http://127.0.0.1:8082/actuator/health | grep -q "UP"; then
            echo "Auction Service is UP and healthy!"
            break
        fi
        sleep 2
    done
fi

echo "=== BidVelocity core platform is LIVE and ready for traffic! ==="

wait
