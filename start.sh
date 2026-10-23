#!/bin/sh
set -e

echo "=== Starting BidVelocity Platform on Render ==="

GATEWAY_PORT=${PORT:-10000}
echo "Gateway port: ${GATEWAY_PORT}"

export PORT=${GATEWAY_PORT}
envsubst '${PORT}' < /app/nginx.conf.template > /etc/nginx/nginx.conf
nginx
echo "Nginx Reverse Proxy running on port ${GATEWAY_PORT}"

JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xms32m -Xmx96m"

echo "1/4 Starting Auth Service on port 8081..."
java ${JVM_OPTS} -Dserver.port=8081 -jar /app/auth-service.jar &

echo "2/4 Starting Auction Service on port 8082..."
java ${JVM_OPTS} -Dserver.port=8082 -jar /app/auction-service.jar &

echo "3/4 Starting Bidding Service on port 8083..."
java ${JVM_OPTS} -Dserver.port=8083 -jar /app/bidding-service.jar &

echo "4/4 Starting Payment Service on port 8084..."
java ${JVM_OPTS} -Dserver.port=8084 -jar /app/payment-service.jar &

echo "=== All microservices launched in background ==="

wait
