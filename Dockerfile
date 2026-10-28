# Multi-stage Docker build for BidVelocity backend on Render
FROM maven:3.9.9-eclipse-temurin-21-jammy AS build
WORKDIR /workspace

# Copy root pom and all module files
COPY pom.xml .
COPY services services

# Build all production JARs without running tests
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install curl, netcat, nginx, gettext-base (for envsubst)
RUN apt-get update && apt-get install -y --no-install-recommends curl netcat nginx gettext-base && rm -rf /var/lib/apt/lists/*

# Copy built unified platform JAR artifact
COPY --from=build /workspace/services/platform-service/target/platform-service-*.jar /app/platform-service.jar

# Copy Nginx template and startup script
COPY nginx.conf.template /app/nginx.conf.template
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Render binds to $PORT dynamically
EXPOSE 8080

ENTRYPOINT ["/app/start.sh"]
