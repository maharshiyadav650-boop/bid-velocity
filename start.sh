#!/bin/sh
set -e

echo "=== Starting BidVelocity Platform on Render ==="

GATEWAY_PORT=${PORT:-10000}
echo "Gateway port: ${GATEWAY_PORT}"

export PORT=${GATEWAY_PORT}
envsubst '${PORT}' < /app/nginx.conf.template > /etc/nginx/nginx.conf
nginx
echo "Nginx Reverse Proxy running on port ${GATEWAY_PORT}"

# Base JVM flags for 512MB RAM cgroup container:
# - SerialGC: low memory footprint GC
# - TieredStopAtLevel=1: C1-only compiler, avoids heavy C2 JIT data structures
# - ReservedCodeCacheSize=16m: limit JIT code cache from 240MB to 16MB
# - CICompilerCount=2: limit JIT compilation threads
# - Xss256k: cut thread stack size from 1024KB to 256KB (75% stack memory savings)
# - UsePerfData=false: disable jvmstat perf data allocation
# - Tomcat thread limits: cap worker threads to 10 instead of default 200
BASE_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:ReservedCodeCacheSize=16m -XX:CICompilerCount=2 -Xss256k -XX:-UsePerfData -Dserver.tomcat.threads.max=10 -Dserver.tomcat.threads.min-spare=2 -Dserver.tomcat.accept-count=10 -Dserver.tomcat.max-connections=20"

# 1. Start Auth Service (essential for login and signup!)
echo "1/4 Starting Auth Service on port 8081..."
java ${BASE_OPTS} -Xms16m -Xmx32m -Dserver.port=8081 -jar /app/auth-service.jar &
AUTH_PID=$!

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
java ${BASE_OPTS} -Xms12m -Xmx24m -Dserver.port=8084 -jar /app/payment-service.jar &
PAYMENT_PID=$!

echo "Waiting for Payment Service to initialize..."
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:8084/actuator/health | grep -q "UP"; then
        echo "Payment Service is UP and healthy!"
        break
    fi
    sleep 2
done

echo "=== All BidVelocity microservices successfully launched! ==="

wait
