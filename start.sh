#!/bin/sh
set -e

echo "Starting BidVelocity Backend on Render..."

# Determine port from Render environment or fallback to 8080
GATEWAY_PORT=${PORT:-8080}
echo "Gateway will bind to port: ${GATEWAY_PORT}"

# Memory-optimized flags for Spring Boot services on Render
JVM_OPTS="-XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"

# 1. Start Eureka Server
echo "1/6 Starting Eureka Discovery Server on port 8761..."
java ${JVM_OPTS} -Xms48m -Xmx96m -jar /app/eureka-server.jar > /tmp/eureka.log 2>&1 &
EUREKA_PID=$!

# Wait briefly for Eureka socket to open
sleep 8

# 2. Start Auth Service
echo "2/6 Starting Auth Service on port 8081..."
java ${JVM_OPTS} -Xms64m -Xmx128m -Dserver.port=8081 -jar /app/auth-service.jar > /tmp/auth.log 2>&1 &
AUTH_PID=$!

# 3. Start Auction Service
echo "3/6 Starting Auction Service on port 8082..."
java ${JVM_OPTS} -Xms64m -Xmx128m -Dserver.port=8082 -jar /app/auction-service.jar > /tmp/auction.log 2>&1 &
AUCTION_PID=$!

# 4. Start Bidding Service
echo "4/6 Starting Bidding Service on port 8083..."
java ${JVM_OPTS} -Xms64m -Xmx128m -Dserver.port=8083 -jar /app/bidding-service.jar > /tmp/bidding.log 2>&1 &
BIDDING_PID=$!

# 5. Start Payment Service
echo "5/6 Starting Payment Service on port 8084..."
java ${JVM_OPTS} -Xms64m -Xmx128m -Dserver.port=8084 -jar /app/payment-service.jar > /tmp/payment.log 2>&1 &
PAYMENT_PID=$!

sleep 10

# 6. Start API Gateway in foreground on Render's $PORT
echo "6/6 Starting API Gateway on port ${GATEWAY_PORT} (Foreground)..."
exec java ${JVM_OPTS} -Xms64m -Xmx128m -Dserver.port=${GATEWAY_PORT} -jar /app/api-gateway.jar
