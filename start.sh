#!/bin/sh
set -e

echo "=== Starting BidVelocity Platform on Render ==="

GATEWAY_PORT=${PORT:-10000}
echo "Gateway port: ${GATEWAY_PORT}"

export PORT=${GATEWAY_PORT}
envsubst '${PORT}' < /app/nginx.conf.template > /etc/nginx/nginx.conf
nginx
echo "Nginx Reverse Proxy running on port ${GATEWAY_PORT}"

BASE_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:ReservedCodeCacheSize=32m -XX:CICompilerCount=2 -Xss512k -XX:MaxMetaspaceSize=160m -Dserver.tomcat.threads.max=25 -Dserver.tomcat.threads.min-spare=3"

# Real-time memory monitor for Render free tier diagnostics
while true; do
    echo "=== Memory Usage at $(date) ===" > /tmp/memory.txt
    free -m >> /tmp/memory.txt 2>/dev/null || true
    echo "" >> /tmp/memory.txt
    echo "=== Top Processes ===" >> /tmp/memory.txt
    ps aux --sort=-%mem | head -n 10 >> /tmp/memory.txt 2>/dev/null || true
    sleep 30
done &

echo "Starting BidVelocity Unified Platform on port 8080..."
(
    while true; do
        java ${BASE_OPTS} -Xms32m -Xmx96m -Dserver.port=8080 -jar /app/platform-service.jar >> /tmp/platform.log 2>&1 || true
        echo "Platform Service exited at $(date). Restarting in 3 seconds..." >> /tmp/platform.log
        sleep 3
    done
) &

echo "Waiting for BidVelocity Platform to initialize..."
for i in $(seq 1 120); do
    if curl -s http://127.0.0.1:8080/actuator/health | grep -q "UP"; then
        echo "BidVelocity Platform is UP and healthy!"
        break
    fi
    sleep 2
done

echo "=== BidVelocity core platform (Auth, Auction, Bidding, Payments, WebSocket) is LIVE! ==="

wait
