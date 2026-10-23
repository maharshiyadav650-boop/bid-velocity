# Multi-stage Docker build for BidVelocity backend on Render
FROM maven:3.9.9-eclipse-temurin-21-jammy AS build
WORKDIR /workspace

# Copy root pom and module poms
COPY pom.xml .
COPY services/eureka-server/pom.xml services/eureka-server/
COPY services/api-gateway/pom.xml services/api-gateway/
COPY services/auth-service/pom.xml services/auth-service/
COPY services/auction-service/pom.xml services/auction-service/
COPY services/bidding-service/pom.xml services/bidding-service/
COPY services/payment-service/pom.xml services/payment-service/

# Cache Maven dependencies
RUN mvn dependency:go-offline -B

# Copy all service source codes
COPY services services

# Build all production JARs without running heavy integration tests
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install curl for health checking
RUN apt-get update && apt-get install -y --no-install-recommends curl netcat && rm -rf /var/lib/apt/lists/*

# Copy built JAR artifacts from build stage
COPY --from=build /workspace/services/eureka-server/target/*.jar /app/eureka-server.jar
COPY --from=build /workspace/services/api-gateway/target/*.jar /app/api-gateway.jar
COPY --from=build /workspace/services/auth-service/target/*.jar /app/auth-service.jar
COPY --from=build /workspace/services/auction-service/target/*.jar /app/auction-service.jar
COPY --from=build /workspace/services/bidding-service/target/*.jar /app/bidding-service.jar
COPY --from=build /workspace/services/payment-service/target/*.jar /app/payment-service.jar

# Copy and set executable permissions on start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Render binds to $PORT dynamically
EXPOSE 8080

ENTRYPOINT ["/app/start.sh"]
