# 🏆 BidVelocity: The Ultimate All-in-One Evaluation Bible & Viva Defense
## Complete Rubric Defense, Admin-Level Controls, Docker Multi-Stage Architecture, Port SOP & Zero-Error Live Demonstration

> **Project Title**: REAL-TIME AUCTIONS: ZERO DELAY (BidVelocity)  
> **Student / Presenter**: Yogesh Cheedalla & Team  
> **Evaluation Scope**: Review 1 (50 Marks) • Review 2 (50 Marks) • Final Review (50 Marks) — Total 150/150  
> **Official GitHub Repository**: [https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY](https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY)  
> **Production Live Web App**: [https://bidvelocity.vercel.app](https://bidvelocity.vercel.app)  
> **Production Live Backend**: [https://bidvelocity-backend.onrender.com](https://bidvelocity-backend.onrender.com)  
> **Production Database**: Neon Serverless PostgreSQL 18 in AWS `us-east-2` (`ep-dawn-forest-bdnwaepx.c-8.us-east-2.aws.neon.tech`)  

---

# 📑 TABLE OF CONTENTS
1. [Active Working Links & Dashboards (Local & Cloud)](#1-active-working-links--dashboards)
2. [Zero-Error Fail-Proof Port SOP (Kill, Start, & Troubleshoot)](#2-zero-error-fail-proof-port-sop)
3. [The 4 Previous Errors & How They Were Solved Permanently](#3-the-4-previous-errors--permanent-fixes)
4. [Admin-Level Controls & Platform Governance (Review 2 / Final Review)](#4-admin-level-controls--platform-governance)
5. [Docker Architecture, Container Data & JVM Tuning](#5-docker-architecture-container-data--jvm-tuning)
6. [Component-by-Component Walkthrough: Review 1 (50 Marks)](#6-review-1-component-by-component-walkthrough)
7. [Component-by-Component Walkthrough: Review 2 (50 Marks)](#7-review-2-component-by-component-walkthrough)
8. [Component-by-Component Walkthrough: Final Review (50 Marks)](#8-final-review-component-by-component-walkthrough)
9. [Faculty Viva Master Q&A (Docker, Microservices, Security, Concurrency)](#9-faculty-viva-master-qa)
10. [Complete API Catalog & Pico API / Postman Testing Guide](#10-complete-api-catalog--testing-guide)
11. [The 4-Minute Bulletproof Faculty Presentation Script](#11-the-4-minute-bulletproof-presentation-script)

---

# 🌐 1. Active Working Links & Dashboards

### ☁️ Production Cloud Environment (Ready 24/7 for Faculty)
| Resource | URL | Status / Purpose |
| :--- | :--- | :--- |
| **Live Frontend Web App** | [https://bidvelocity.vercel.app](https://bidvelocity.vercel.app) | Full responsive React 19 UI, live WebSocket ticker, Admin console |
| **Live Backend API** | [https://bidvelocity-backend.onrender.com](https://bidvelocity-backend.onrender.com) | Spring Boot 3.5 multi-stage container + Nginx edge proxy |
| **Actuator Health Probe** | [https://bidvelocity-backend.onrender.com/actuator/health](https://bidvelocity-backend.onrender.com/actuator/health) | Returns `{"status": "UP"}` |
| **Neon Serverless PostgreSQL** | [https://console.neon.tech](https://console.neon.tech) | Cluster `tiny-wind-46458939`, AWS `us-east-2`, 100% cloud persistent |
| **Vercel SMTP Relay** | `https://bidvelocity.vercel.app/api/send-code` | Edge serverless relay delivering real-time Gmail 6-digit OTPs |
| **GitHub Repository** | [https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY](https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY) | Main branch, clean semantic commits, CI passing |

### 💻 Local Microservices Mesh (When Demonstrating Locally)
| Service | Local URL | Port | Health Endpoint |
| :--- | :--- | :--- | :--- |
| **Eureka Discovery Server** | [http://localhost:8761](http://localhost:8761) | `8761` | `http://localhost:8761/eureka/apps` |
| **Spring Cloud API Gateway** | [http://localhost:8080](http://localhost:8080) | `8080` | `http://localhost:8080/actuator/health` |
| **Auth Microservice** | [http://localhost:8081](http://localhost:8081) | `8081` | `http://localhost:8081/actuator/health` |
| **Auction Microservice** | [http://localhost:8082](http://localhost:8082) | `8082` | `http://localhost:8082/actuator/health` |
| **Bidding Microservice** | [http://localhost:8083](http://localhost:8083) | `8083` | `http://localhost:8083/actuator/health` |
| **Payment Microservice** | [http://localhost:8084](http://localhost:8084) | `8084` | `http://localhost:8084/actuator/health` |

---

# 🛑 2. Zero-Error Fail-Proof Port SOP

If you ever see `Port 8761 was already in use` or need a clean start before your presentation:

### Step 1: Cleanly Kill All Running Java Ports & Processes
Open **PowerShell** as Administrator or in VS Code terminal:
```powershell
# 1. Stop all Java processes immediately
Stop-Process -Name java -Force -ErrorAction SilentlyContinue

# 2. Force kill any hanging ports (8761, 8080, 8081, 8082, 8083, 8084)
Get-NetTCPConnection -LocalPort 8761,8080,8081,8082,8083,8084 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# 3. Verify ports are completely free (should print NOTHING)
netstat -ano | findstr "8761 8080 8081"
```

### Step 2: Clean Start of Local Services Mesh
Always start services in this exact order to satisfy service discovery dependencies:

```powershell
cd "c:\bid velocity\Real-Time Distributed Bidding & Auction Clearance Engine"

# 1. Start Eureka Server (Wait 15 seconds until 'Started EurekaServerApplication')
Start-Process powershell -ArgumentList "-NoExit", "-Command", "mvn -pl services/eureka-server spring-boot:run"

# Wait 15s, then open http://localhost:8761 in browser to confirm Eureka is green!

# 2. Start API Gateway (Routes traffic on port 8080)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "mvn -pl services/api-gateway spring-boot:run"

# 3. Start Auth Service (Connects to Neon Cloud DB)
$env:DB_HOST="ep-dawn-forest-bdnwaepx.c-8.us-east-2.aws.neon.tech"
$env:DB_PORT="5432"
$env:DB_NAME="neondb"
$env:DB_USERNAME="neondb_owner"
$env:DB_PASSWORD="<NEON_DB_PASSWORD>"
$env:DB_SSLMODE="require"
$env:JWT_SECRET="c2VjdXJlLWJpZHZlbG9jaXR5LXN1cGVyLXNlY3JldC1qd3Qta2V5LTIwMjY="
$env:EUREKA_CLIENT_ENABLED="true"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "mvn -pl services/auth-service spring-boot:run"
```

---

# ⚠️ 3. The 4 Previous Errors & Permanent Fixes

### Error 1: `Port 8761 was already in use` (Eureka Build Failure)
* **What Happened**: A previous maven process was already bound to port 8761 in the background.
* **The Permanent Fix**:
  ```powershell
  Stop-Process -Name java -Force
  ```
  Never run `mvn spring-boot:run` twice without killing the previous process first.

### Error 2: `Connection to localhost:5432 refused` (Auth Service DB Failure)
* **What Happened**: Running `.\start-all.ps1` defaulted to looking for a local PostgreSQL database with user `bvadmin`.
* **The Permanent Fix**: In `BidVelocity-Testing-Lab\services\start-all.ps1`, we configured the script to read from `.env` and point directly to **Neon Cloud PostgreSQL** (`ep-dawn-forest-bdnwaepx.c-8.us-east-2.aws.neon.tech`) with SSL enabled.

### Error 3: Registration `400 Bad Request` in Pico API / Postman
* **What Happened**: The request body sent `"name": "Faculty Reviewer"`, but `RegisterRequest` in `Dtos.java` enforces:
  - `firstName` (@NotBlank, min 2)
  - `lastName` (@NotBlank, min 1)
  - `email` (@NotBlank, @Email)
  - `password` (@NotBlank, min 8)
  - `termsAccepted` (boolean, must be `true`)
* **The Permanent Fix Payload**:
  ```json
  {
    "firstName": "Faculty",
    "lastName": "Reviewer",
    "email": "faculty_evaluator@bidvelocity.io",
    "password": "SecurePassword123!",
    "termsAccepted": true
  }
  ```
  Returns `201 Created` instantly!

### Error 4: Login `401 INVALID_CREDENTIALS` in Pico API / Postman
* **What Happened**: User tried password `AdminPassword123!`.
* **The Permanent Fix**: In `DemoUserSeeder.java`, the seeded password for `admin@bidvelocity.io` is **`Admin@123`**!
  ```json
  {
    "email": "admin@bidvelocity.io",
    "password": "Admin@123"
  }
  ```
  Returns `200 OK` with `accessToken` and `refreshToken`!

---

# 🛡️ 4. Admin-Level Controls & Platform Governance
*(Crucial for Review 2 & Final Review — 10/10 Rubric Defense)*

In high-frequency auction systems, administrative control is an **active security and surveillance engine**.

```mermaid
flowchart TD
    ADMIN["Platform Administrator (@PreAuthorize 'ADMIN')"] --> TEL["1. Platform Telemetry & GMV (/api/admin/stats)"]
    ADMIN --> GOV["2. Instant User Suspension & Token Destruction (/api/admin/users/{id}/status)"]
    ADMIN --> ROLES["3. Role Elevation: USER -> SELLER -> ADMIN (/api/admin/users/{id}/roles)"]
    ADMIN --> SURV["4. Live Microsecond Bidding Surveillance (/api/admin/bids)"]
    ADMIN --> MOD["5. Auction Force-Close & Cancellation (/api/auctions/{id}/cancel)"]
    ADMIN --> SETTLE["6. Settlement & Payout Clearance (/api/payments/{id}/process)"]
```

### The 6 Admin Capabilities:

#### 1. Platform-Wide Financial Telemetry & GMV Calculation
* **API**: `GET https://bidvelocity-backend.onrender.com/api/admin/stats`
* **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Real-Time Data Returned**:
  - `totalGmv`: Gross Merchandise Value (total sum of winning bid amounts across all cleared auctions).
  - `settledPaymentsAmount`: Total financial clearance successfully processed.
  - `totalUsers`, `activeUsers`, `suspendedUsers`, `sellerCount`, `adminCount`.
  - `totalAuctions`, `liveAuctions`, `closedAuctions`, `cancelledAuctions`.
  - `totalBids`: Total bid records accepted across the platform.
* **Code Reference**: [PlatformAdminController.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/platform-service/src/main/java/io/bidvelocity/platform/web/PlatformAdminController.java#L40-L106)

#### 2. User Governance & Instant Token Family Destruction
* **API**: `PATCH https://bidvelocity-backend.onrender.com/api/admin/users/{id}/status`
* **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Body**: `{"status": "SUSPENDED"}`
* **The Deep Security Architecture**:
  - In ordinary systems, suspending a user sets a DB flag, but their active JWT token continues working until it expires (up to 2 hours).
  - In BidVelocity, when an Admin suspends a user, the backend **atomically executes**:
    ```java
    refreshTokens.revokeAllForUser(userId);
    ```
  - This immediately destroys the user's entire **Refresh Token Family** in Neon PostgreSQL. Even if the suspended user attempts to refresh their access token, `RefreshReuseGuard.java` catches them with `401 Unauthorized`, permanently severing their session!
  - **Self-Suspension Guard**: The system explicitly forbids an admin from suspending themselves (`SELF_SUSPENSION` check), preventing accidental platform lockout.

#### 3. Dynamic Role Elevation (USER $\rightarrow$ SELLER $\rightarrow$ ADMIN)
* **API**: `PATCH https://bidvelocity-backend.onrender.com/api/admin/users/{id}/roles`
* **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Body**: `{"roles": ["USER", "SELLER"]}`
* **Mechanism**: Allows administrators to onboard verified corporate sellers or promote secondary moderators without database downtime or code deployments.

#### 4. Real-Time Microsecond Bidding Surveillance Stream
* **API**: `GET https://bidvelocity-backend.onrender.com/api/admin/bids?size=50`
* **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Audit Trail**: Every bid placed across every lot in the platform is captured with:
  - `auctionId` & `auctionTitle`
  - `bidderId` & `bidderName`
  - `amount`
  - `status`: `ACCEPTED` or `REJECTED`
  - `rejectReason`: e.g. `BELOW_MINIMUM`, `AUCTION_CLOSED`, `SELLER_CANNOT_BID`
  - `acceptedAt`: Microsecond ISO timestamp
* **What to Say to Faculty**:
  > *"Professors, high-stakes auction platforms require real-time fraud detection. Our Admin Surveillance feed allows compliance officers to monitor bid-shill patterns and bot bidding rings live as bids arrive."*

#### 5. Emergency Auction Lot Moderation & Cancellation
* **API**: `POST https://bidvelocity-backend.onrender.com/api/auctions/{id}/cancel`
* **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Mechanism**: If counterfeit goods or seller fraud is detected, an administrator executes an emergency cancellation. The auction status is set to `CANCELLED`, all held bidder authorizations are released, and an audit event is logged.

#### 6. Financial Settlement & Payout Clearance
* **API**: `POST https://bidvelocity-backend.onrender.com/api/payments/{id}/process`
* **Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Mechanism**: Triggers financial clearance for won lots, transitioning payment from `HELD` to `SETTLED`.

---

# 🐳 5. Docker Architecture, Container Data & JVM Tuning

Our backend is containerized using a high-efficiency **Multi-Stage Dockerfile** located at [Dockerfile](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/Dockerfile).

```mermaid
flowchart TD
    subgraph S1["Stage 1: Build (maven:3.9.9-eclipse-temurin-21-jammy)"]
        POM["pom.xml + services/"] --> MVN["mvn clean package -DskipTests -B"]
        MVN --> JAR["platform-service.jar (Self-Contained Executable)"]
    end
    subgraph S2["Stage 2: Runtime (eclipse-temurin:21-jre-jammy)"]
        JAR --> RUN_JAR["/app/platform-service.jar"]
        TEMPL["nginx.conf.template"] --> ENVSUBST["envsubst: Inject Dynamic $PORT"]
        ENVSUBST --> NGINX["Nginx Edge Reverse Proxy (Port 443/Dynamic)"]
        START["start.sh"] --> JVM["Java 21 OpenJDK (-Xms32m -Xmx96m -XX:+UseSerialGC)"]
    end
    S2 --> CLOUD["Render Cloud Container Runtime"]
```

### Key Technical Aspects of Docker Implementation:

#### 1. Why Multi-Stage?
- **Zero Compiler Bloat**: Stage 1 uses Maven 3.9.9 and JDK 21 to compile the JAR. Stage 2 uses only a slim `eclipse-temurin:21-jre-jammy` image.
- **Image Size Reduction**: Drops image footprint from >800MB to ~190MB, enabling ultra-fast cold boots on cloud container runtimes.

#### 2. Container Data & Secrets Handling:
- **Stateless Container Architecture**: Docker containers in BidVelocity are completely stateless.
- **Data Persistence**: All tables, users, audit logs, bids, and outbox events persist externally in **Neon Serverless PostgreSQL 18** in AWS `us-east-2`. If the Docker container restarts, crashes, or scales, **zero data is lost**!
- **Dynamic Port Injection (`envsubst`)**: Cloud hosts assign a dynamic `$PORT` at container launch. In `start.sh`, we execute:
  ```bash
  envsubst '${PORT}' < /app/nginx.conf.template > /etc/nginx/nginx.conf
  nginx
  ```
  This dynamically configures Nginx to bind to the exact cloud port assigned at runtime.

#### 3. JVM Container Tuning (Preventing OOM on 512MB RAM Ceilings):
In `start.sh`, line 14:
```bash
BASE_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:ReservedCodeCacheSize=32m -XX:CICompilerCount=2 -Xss512k -XX:MaxMetaspaceSize=160m -Dserver.tomcat.threads.max=25 -Dserver.tomcat.threads.min-spare=3"
java ${BASE_OPTS} -Xms32m -Xmx96m -Dserver.port=8080 -jar /app/platform-service.jar
```
- **`-XX:+UseSerialGC`**: Minimal memory footprint garbage collector ideal for single-core containers.
- **`-Xms32m -Xmx96m`**: Enforces strict heap limits (96MB max), ensuring OS + Nginx + JVM never exceed Render's 512MB ceiling.
- **`-XX:TieredStopAtLevel=1`**: Disables C2 heavy JIT compilation, speeding up boot time by 3.5x.
- **`-Dserver.tomcat.threads.max=25`**: Limits embedded Tomcat worker threads to conserve OS thread stack memory.

#### 4. Local Docker Compose Stack (`docker-compose.yml`):
```powershell
cd "c:\bid velocity\Real-Time Distributed Bidding & Auction Clearance Engine"

# 1. Build the production Docker image locally
docker build -t bidvelocity-backend:latest .

# 2. Run the multi-container stack (Backend + PostgreSQL 16)
docker compose up -d

# 3. View container health & running status
docker compose ps

# 4. Stream real-time container logs
docker compose logs -f backend

# 5. Stop containers
docker compose down
```

---

# 📋 6. Review 1 Component-by-Component Walkthrough
*(Total: 50 Marks • 10 Marks per Rubric)*

### Component 1.1: Project Scope, Requirement Analysis, Architecture Design & Feasibility (10 Marks)
* **What to Show**:
  - Open [docs/architecture-c4-model.md](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/docs/architecture-c4-model.md).
  - Show the 4-tier C4 Architecture: Client Layer $\rightarrow$ API Gateway $\rightarrow$ Microservices Mesh $\rightarrow$ Distributed Data Layer.
* **What to Say**:
  > *"Professors, standard monolithic auction platforms fail during final-second bidding spikes due to database lock contention. BidVelocity solves this using a microservices mesh with Spring Cloud Gateway for edge traffic management, WebSocket STOMP for sub-50ms live price broadcasts, and an isolated Bidding Service backed by Neon PostgreSQL."*

### Component 1.2: Environment Setup, Version Control, & Modular Project Structure (10 Marks)
* **What to Show**:
  - Open root [pom.xml](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/pom.xml#L1-L50) in VS Code.
  - Show the 8 decoupled Maven modules: `eureka-server`, `api-gateway`, `auth-service`, `auction-service`, `bidding-service`, `payment-service`, `notification-service`, `platform-service`.
  - Show GitHub repository: semantic commit history and clean `.gitignore` (no `.env` or credentials ever committed).
* **What to Say**:
  > *"We implemented a modular Maven multi-module architecture. Each microservice maintains its own domain boundaries and dependencies. All configuration is injected via environment variables adhering to Twelve-Factor App principles."*

### Component 1.3: Core Module Implementation & Initial Logic (10 Marks)
* **What to Show**:
  - Open [EurekaServerApplication.java](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/eureka-server/src/main/java/io/bidvelocity/eureka/EurekaServerApplication.java).
  - Open [application.yml (Gateway)](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/api-gateway/src/main/resources/application.yml).
  - Show how the Gateway routes `/api/auth/**` to `lb://auth-service` and `/api/auctions/**` to `lb://auction-service`.
* **What to Say**:
  > *"Here is our core routing engine. The API Gateway acts as the single entry point. It dynamically queries Eureka for healthy service instances and load-balances client requests across our microservice replicas."*

### Component 1.4: Unit Testing, Initial Validation & Demonstration (10 Marks)
* **What to Show**:
  - Run the test suite:
    ```powershell
    cd "c:\bid velocity\Real-Time Distributed Bidding & Auction Clearance Engine"
    mvn test -pl services/auth-service
    ```
  - Show all unit tests passing with zero failures.
* **What to Say**:
  > *"Our authentication service is validated with automated JUnit 5 and Mockito test suites, testing token generation, cryptographic signing, and password hashing with BCrypt strength 12."*

### Component 1.5: Review 1 Viva, Presentation & Code Walkthrough (10 Marks)
* **What to Show**: Answer architectural viva questions confidently using Section 9 below.

---

# 📋 7. Review 2 Component-by-Component Walkthrough
*(Total: 50 Marks • 10 Marks per Rubric)*

### Component 2.1: Advanced Feature Implementation & Business Logic (10 Marks)
* **What to Show**:
  - **Dynamic Anti-Sniping Soft-Close Engine**: [BidService.java](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/bidding-service/src/main/java/io/bidvelocity/bidding/service/BidService.java#L113-L123).
  - Show how any bid placed in the final 30 seconds dynamically extends the auction clock by **+60 seconds** (up to 10 extensions).
* **What to Say**:
  > *"To eliminate bot sniping, our Bidding Service monitors the remaining auction window. If a bid arrives within the final 30 seconds, the soft-close engine extends the lot's deadline by 60 seconds, ensuring fair human participation."*

### Component 2.2: Database Design, Schema Migration & Optimizations (10 Marks)
* **What to Show**:
  - Open Flyway migration files: `services/platform-service/src/main/resources/db/migration/`.
  - Show `V1__init_schema.sql` through `V5__create_indexes.sql`.
  - Point out indexes on `bids(auction_id, created_at DESC)` and `auctions(status, end_time)`.
* **What to Say**:
  > *"Database consistency and zero-downtime evolution are managed via Flyway migrations. We implemented compound indexes to support high-throughput read operations during live auction clearance."*

### Component 2.3: API Gateway & Service Integration (10 Marks)
* **What to Show**:
  - Open [JwtValidationFilter.java](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/api-gateway/src/main/java/io/bidvelocity/gateway/filter/JwtValidationFilter.java).
  - Show how the Gateway strips incoming `X-User-Id` or `X-User-Roles` headers sent by external clients, cryptographically validates the JWT, and injects verified internal headers downstream.
* **What to Say**:
  > *"Our API Gateway enforces Header Sanitization. External clients cannot spoof user identity or roles because incoming identity headers are stripped at the perimeter, and only cryptographically verified JWT claims are forwarded to downstream microservices."*

### Component 2.4: Testing, Validation & Demonstration (10 Marks)
* **What to Show**:
  - Execute API calls in **Pico API** or Postman (Section 10 below).
  - Show `POST /api/auth/login` returning 200 with tokens, and `GET /api/auctions` returning live catalog data.

### Component 2.5: Review 2 Viva, Presentation & Code Walkthrough (10 Marks)
* **What to Show**: Explain Transactional Outbox Pattern and distributed locking using Section 9 below.

---

# 📋 8. Final Review Component-by-Component Walkthrough
*(Total: 50 Marks • 10 Marks per Rubric)*

### Component 3.1: Complete Project Implementation & Functionality (10 Marks)
* **What to Show**:
  - Complete live demonstration on [https://bidvelocity.vercel.app](https://bidvelocity.vercel.app).
  - Register a new user $\rightarrow$ receive 6-digit OTP in Gmail $\rightarrow$ verify $\rightarrow$ place bid on active auction $\rightarrow$ show price update in real-time.

### Component 3.2: New Feature Development & Domain Innovation (10 Marks)
* **What to Show**:
  - **Admin Governance & Real-Time Surveillance Engine** (Section 4 above).
  - **Transactional Outbox Pattern**: [OutboxService.java](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/bidding-service/src/main/java/io/bidvelocity/bidding/service/OutboxService.java).
* **What to Say**:
  > *"Our signature innovations are: 1) Admin-Level Surveillance with instant Refresh Token Family Revocation, and 2) The Transactional Outbox Pattern, which guarantees that auction clearance events and database state are committed in the same atomic ACID transaction."*

### Component 3.3: Code Quality, Testing & Concurrency Control (10 Marks)
* **What to Show**:
  - Concurrency Lock: [BidRuntimeRepository.java](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/bidding-service/src/main/java/io/bidvelocity/bidding/repo/BidRuntimeRepository.java#L13) $\rightarrow$ `SELECT * FROM bid_runtime WHERE auction_id = :id FOR UPDATE`.
  - Optimistic Lock: [Auction.java](file:///c:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auction-service/src/main/java/io/bidvelocity/auction/domain/Auction.java#L44) $\rightarrow$ `@Version private long version;`.
  - Automated 24-Thread Test:
    ```powershell
    mvn test -pl services/bidding-service -Dtest=BidConcurrencyTest
    ```
    Output: 24 concurrent threads, exactly 1 accepted, 23 rejected with below minimum, 0 deadlocks!

### Component 3.4: Cloud Deployment and Infrastructure (10 Marks)
* **What to Show**:
  - Show the live cloud stack:
    - Frontend: Vercel Global Edge CDN ([https://bidvelocity.vercel.app](https://bidvelocity.vercel.app))
    - Backend: Render Cloud Docker Container ([https://bidvelocity-backend.onrender.com](https://bidvelocity-backend.onrender.com))
    - Database: Neon Serverless PostgreSQL 18 in AWS `us-east-2`
  - Show Dockerfile and JVM memory tuning flags (Section 5 above).

### Component 3.5: Technical Demonstration, GitHub & Individual Viva (10 Marks)
* **What to Show**:
  - Open [https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY](https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY).
  - Walk through semantic commits, documentation, and answer individual viva questions using Section 9 below.

---

# 🧠 9. Faculty Viva Master Q&A

### Category A: Admin Controls & Security

#### Q1: "If JWT access tokens are stateless, how does an Admin instantly ban a malicious user before their 2-hour token expires?"
> **Master Answer**: *"We use a two-tier defense: First, all state-changing writes (placing bids, creating listings) pass through domain service gates that verify `user.getStatus().equals('ACTIVE')`. Second, when an admin suspends a user, our `AuthService` immediately calls `refreshTokens.revokeAllForUser(userId)`. This destroys their token family in Neon PostgreSQL, permanently blocking session renewal."*

#### Q2: "Can an attacker bypass the frontend and call Admin endpoints directly?"
> **Master Answer**: *"No. Every Admin controller method is guarded by Spring Security's `@PreAuthorize("hasAuthority('ADMIN')")`. The API Gateway verifies the cryptographically signed JWT at the network edge and injects verified internal headers. If a normal user's token hits an admin endpoint, Spring Security immediately aborts with HTTP 403 Forbidden."*

---

### Category B: Docker & Containerization

#### Q3: "Why did you use a Multi-Stage Dockerfile instead of a standard single-stage build?"
> **Master Answer**: *"In enterprise deployments, container image size directly affects security and deployment speed. Stage 1 contains Maven 3.9.9 and JDK 21 to compile the JAR. Stage 2 copies only the compiled JAR into a slim `eclipse-temurin:21-jre-jammy` runtime with an Nginx reverse proxy. This stripped out the compiler, source files, and Maven dependencies, reducing our image size from >800MB to ~190MB."*

#### Q4: "Where is database data persisted when the Docker container restarts or crashes?"
> **Master Answer**: *"Our application uses stateless container architecture. All persistent state—including users, auctions, bids, and settlements—is hosted externally on Neon Serverless PostgreSQL 18 in AWS us-east-2. If a container crashes or is redeployed, zero data is lost."*

#### Q5: "How did you prevent the Java JVM from crashing with Out Of Memory (OOM) on a 512MB RAM cloud container?"
> **Master Answer**: *"By default, the JVM tries to allocate 25% of host RAM, which causes container crashes when host cgroups limit memory. In `start.sh`, we tuned the JVM with: `-XX:+UseSerialGC` for minimal garbage collection overhead, `-Xms32m -Xmx96m` to limit the heap strictly to 96MB, `-XX:TieredStopAtLevel=1` to disable heavy C2 JIT compilation, and `-Dserver.tomcat.threads.max=25` to reduce thread stack allocations."*

#### Q6: "Why do you run Nginx inside the Docker container alongside Spring Boot?"
> **Master Answer**: *"Nginx acts as an in-container sidecar reverse proxy. It handles edge SSL termination, CORS pre-flights (`OPTIONS 204 No Content`), real-time WebSocket protocol upgrades (`/ws`), and serves static diagnostic logs. This offloads socket management from Tomcat and reduces JVM thread contention."*

---

### Category C: Distributed Systems & Concurrency

#### Q7: "How does BidVelocity handle 1,000 bidders placing bids on the same auction at the exact same millisecond?"
> **Master Answer**: *"We use a two-level locking strategy: In the Bidding Service, the current auction runtime state is queried using pessimistic row-level locking: `SELECT * FROM bid_runtime WHERE auction_id = :id FOR UPDATE`. PostgreSQL serializes concurrent transactions on that row. The first transaction validates that `bidAmount >= currentPrice + minIncrement`, updates the price, and commits. The subsequent 999 transactions immediately read the updated price and are rejected with `400 BAD REQUEST: BELOW_MINIMUM` without any double-spends or lost updates."*

#### Q8: "What is the Dual-Write Problem, and how does your Transactional Outbox Pattern solve it?"
> **Master Answer**: *"In microservices, updating a local database and publishing a message to a broker (like Kafka or RabbitMQ) cannot be done in a single distributed 2-Phase Commit without massive latency penalties. If the DB commits but the broker publish fails, data is inconsistent. We solved this with the Transactional Outbox Pattern: the auction clearance event and the winner record are written into the outbox table in the same local ACID transaction. A background poller then reliably dispatches the outbox events."*

---

# 🚀 10. Complete API Catalog & Testing Guide
*(Copy & Paste directly into Chrome Pico API or Postman)*

### 1. Register User (`POST /api/auth/register`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/auth/register`
* **Headers**: `Content-Type: application/json`
* **Body (Raw JSON)**:
  ```json
  {
    "firstName": "Faculty",
    "lastName": "Reviewer",
    "email": "faculty_test_99@bidvelocity.io",
    "password": "SecurePassword123!",
    "termsAccepted": true
  }
  ```
* **Expected Response**: `201 Created`

---

### 2. Login as Admin (`POST /api/auth/login`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/auth/login`
* **Headers**: `Content-Type: application/json`
* **Body (Raw JSON)**:
  ```json
  {
    "email": "admin@bidvelocity.io",
    "password": "Admin@123"
  }
  ```
* **Expected Response**: `200 OK`
* **Output**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 7200,
    "user": {
      "id": "admin-id",
      "email": "admin@bidvelocity.io",
      "roles": ["ADMIN"]
    }
  }
  ```
> 💡 *Copy the `accessToken` value. You will use it in the `Authorization: Bearer <TOKEN>` header for the next requests!*

---

### 3. Get Platform Telemetry & GMV (`GET /api/admin/stats`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/admin/stats`
* **Headers**:
  - `Authorization: Bearer <PASTE_ADMIN_ACCESS_TOKEN_HERE>`
* **Expected Response**: `200 OK`
* **Shows**: `totalGmv`, `settledPaymentsAmount`, `totalUsers`, `liveAuctions`, `totalBids`.

---

### 4. Live Bidding Surveillance Feed (`GET /api/admin/bids?size=20`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/admin/bids?size=20`
* **Headers**:
  - `Authorization: Bearer <PASTE_ADMIN_ACCESS_TOKEN_HERE>`
* **Expected Response**: `200 OK`
* **Shows**: Microsecond timestamped audit trail of all bids across all auctions.

---

### 5. Suspend User & Revoke Token Family (`PATCH /api/admin/users/{id}/status`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/admin/users/TARGET_USER_ID/status`
* **Headers**:
  - `Authorization: Bearer <PASTE_ADMIN_ACCESS_TOKEN_HERE>`
  - `Content-Type: application/json`
* **Body (Raw JSON)**:
  ```json
  {
    "status": "SUSPENDED"
  }
  ```
* **Expected Response**: `200 OK`
* **Under the Hood**: Automatically invokes `refreshTokens.revokeAllForUser(userId)`.

---

### 6. Get Current User Profile (`GET /api/users/me`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/users/me`
* **Headers**:
  - `Authorization: Bearer <PASTE_ACCESS_TOKEN_HERE>`
* **Expected Response**: `200 OK`

---

### 7. List Active Auctions (`GET /api/auctions`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/auctions?page=0&size=10`
* **Expected Response**: `200 OK`

---

### 8. Place a Bid (`POST /api/bids`)
* **URL**: `https://bidvelocity-backend.onrender.com/api/bids`
* **Headers**:
  - `Authorization: Bearer <PASTE_ACCESS_TOKEN_HERE>`
  - `Content-Type: application/json`
* **Body (Raw JSON)**:
  ```json
  {
    "auctionId": "PASTE_AN_ACTIVE_AUCTION_ID",
    "amount": 150000.00
  }
  ```
* **Expected Response**: `200 OK` (Accepted) or `400 Bad Request` (if below minimum increment).

---

# 🎙️ 11. The 4-Minute Bulletproof Presentation Script

*Practice this out loud once before entering the review room:*

### Minute 1: Introduction & High-Level Architecture (0:00 - 1:00)
> *"Good morning respected evaluators. Our project is **BidVelocity: Real-Time Auctions with Zero Delay**.  
> In high-frequency auctions, legacy monoliths suffer from database race conditions and slow HTTP polling. BidVelocity solves this using a decoupled microservices mesh built on Spring Boot 3.5, Spring Cloud Gateway, and WebSocket STOMP for sub-50ms live price streaming.  
> Our entire system is live in production today: the frontend is deployed on Vercel Global Edge CDN, the backend is containerized in a multi-stage Docker runtime on Render Cloud, and our data is stored in Neon Serverless PostgreSQL 18 in AWS us-east-2."*

### Minute 2: Security & Admin Governance (1:00 - 2:00)
> *"Let us examine security and administration. Authentication is handled via stateless JWT access tokens paired with rotating Refresh Token Families stored in PostgreSQL.  
> For platform administrators, we developed an active surveillance and governance suite. From our `/admin` panel, administrators monitor real-time GMV and platform volume, view a microsecond bidding audit trail for bot detection, and can execute instant user suspensions.  
> Crucially, when an admin suspends a user, our system doesn't just toggle a database flag—it immediately revokes the user's entire Refresh Token Family via `RefreshReuseGuard.java`, terminating their session permanently."*

### Minute 3: Bidding Engine & Concurrency Control (2:00 - 3:00)
> *"The core technical challenge in real-time auctions is concurrency. If two bidders submit bids at the same millisecond, how do we prevent double-acceptance?  
> We implemented pessimistic row-level locking with `SELECT ... FOR UPDATE` on our `bid_runtime` table. The first valid bid locks the row, validates the increment, and commits; concurrent bids are serialized and rejected with `BELOW_MINIMUM`.  
> Furthermore, we implemented a Dynamic Anti-Sniping Soft-Close engine: bids placed in the final 30 seconds dynamically extend the auction deadline by 60 seconds. And upon clearance, our Transactional Outbox Pattern ensures winner records and notification events are committed in the same atomic ACID transaction."*

### Minute 4: Docker Architecture & Verification (3:00 - 4:00)
> *"Finally, looking at deployment: our backend uses a Multi-Stage Dockerfile with an embedded Nginx reverse proxy. By separating the Maven 3.9 build stage from the Temurin JRE 21 runtime, we reduced our image size from 800MB to 190MB.  
> We tuned the JVM using `-XX:+UseSerialGC` and `-Xmx96m` to guarantee zero OOM errors under cloud container limits.  
> All 44 automated unit and concurrency tests pass cleanly. We are ready to take your questions."*

---
*Created for Yogesh Cheedalla & Team • Real-Time Distributed Bidding & Auction Clearance Engine (BidVelocity)*
