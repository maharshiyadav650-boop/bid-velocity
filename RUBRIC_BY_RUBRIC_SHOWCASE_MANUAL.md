# 🎯 BidVelocity: The Ultimate Rubric-by-Rubric Showcase Manual
## Complete Step-by-Step Defense Guide for Review 1, Review 2 & Final Review (150/150 Marks)

> **Platform**: REAL-TIME AUCTIONS: ZERO DELAY (BidVelocity)  
> **Repository**: [https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY](https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY)  
> **Live App**: [https://bidvelocity.vercel.app](https://bidvelocity.vercel.app) | **Live API**: [https://bidvelocity-backend.onrender.com](https://bidvelocity-backend.onrender.com)  
> **Database**: Neon Serverless PostgreSQL 18 (`tiny-wind-46458939` in AWS `us-east-2`)

---

# 📘 Part 1: Review 1 — Architecture, Design & Initial Implementation (50 Marks)

---

### Component 1.1: Microservices Design and Service Discovery (10 Marks)
* **College Rubric Target (10 Marks)**: *"Complete modular microservices with reliable service discovery, proper configuration and robust error handling."*

#### 1. What to Show:
- Open Chrome at **`http://localhost:8761`** (Eureka Server Dashboard).
- Point to the **"Instances currently registered with Eureka"** table.
- Show **`API-GATEWAY`** (Port `8080`) and **`AUTH-SERVICE`** (Port `8081`) running with status **`UP (1)`**.

#### 2. How to Show It (Your Speaking Script):
> *"Professors, rather than hardcoding IP addresses or building a monolith, we engineered a dynamic service mesh using Netflix Eureka and Spring Cloud. Microservices register themselves dynamically on boot without static coupling. Notice the renewal threshold and 30-second heartbeat intervals. If any microservice instance crashes, Eureka's eviction algorithm removes it from the routing table, guaranteeing that client traffic is never forwarded to an unhealthy node."*

#### 3. Live PowerShell Command to Run:
```powershell
# Query Eureka registry over REST to prove dynamic JSON discovery to faculty
Invoke-RestMethod -Uri "http://localhost:8761/eureka/apps" -Headers @{'Accept'='application/json'} | ConvertTo-Json -Depth 4
```

#### 4. APIs & Verification:
- **Endpoint**: `GET http://localhost:8761/eureka/apps`
- **Response Status**: `200 OK`
- **Output JSON Proof**:
  ```json
  {
    "applications": {
      "application": [
        { "name": "API-GATEWAY", "instance": [{ "status": "UP", "port": 8080 }] },
        { "name": "AUTH-SERVICE", "instance": [{ "status": "UP", "port": 8081 }] }
      ]
    }
  }
  ```

#### 5. Exact Code Files to Open in VS Code:
- [EurekaServerApplication.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/eureka-server/src/main/java/io/bidvelocity/eureka/EurekaServerApplication.java#L8-L12) $\rightarrow$ Show `@EnableEurekaServer` annotation.
- [application.yml (Gateway)](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/api-gateway/src/main/resources/application.yml#L45-L50) $\rightarrow$ Show `eureka.client.service-url.defaultZone: http://localhost:8761/eureka/`.

#### 6. Faculty Viva Question & Winning Answer:
* **Q: "Why Eureka instead of Kubernetes internal DNS?"**
* **A**: *"Eureka operates at Layer 7 application level within the JVM ecosystem. It allows fine-grained ribbon load balancing, instance metadata propagation (like canary versions or tenant tags), and near-instant local development discovery without requiring a heavy Kubernetes cluster."*

---

### Component 1.2: REST API Development and HTTP Methods (10 Marks)
* **College Rubric Target (10 Marks)**: *"Complete RESTful API implementation with proper resource handling, validation, status codes and standardized responses."*

#### 1. What to Show:
- Show that your backend strictly obeys RFC HTTP status codes:
  - `POST /api/auth/register` $\rightarrow$ Returns **`201 Created`** with created user entity.
  - `POST /api/auth/login` $\rightarrow$ Returns **`200 OK`** with dual tokens.
  - Invalid payload $\rightarrow$ Returns **`400 Bad Request`** with structured error envelope.
  - Duplicate email $\rightarrow$ Returns **`409 Conflict`**.
  - Protected endpoint without token $\rightarrow$ Returns **`401 Unauthorized`**.

#### 2. How to Show It (Your Speaking Script):
> *"We do not return raw string messages or default 500 stack traces. Every API response follows strict RESTful semantics. When a client submits invalid data, Spring's Jakarta validation triggers our `@RestControllerAdvice` Global Exception Handler, returning an RFC-compliant structured error envelope with correlation IDs for distributed tracing."*

#### 3. Live PowerShell Commands to Run:
```powershell
# Command A: Successful Registration returning HTTP 201 Created
$registerBody = @{
    email = "review_candidate_$(Get-Random)@bidvelocity.io"
    password = "SecurePassword123!"
    name = "College Reviewer"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json" | ConvertTo-Json

# Command B: Validation Failure returning HTTP 400 Bad Request
try {
    $badBody = @{ email = "not-an-email"; password = "short"; name = "" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -Body $badBody -ContentType "application/json"
} catch {
    $_.ErrorDetails.Message
}
```

#### 4. Exact Code Files to Open in VS Code:
- [AuthController.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/java/io/bidvelocity/auth/web/AuthController.java#L23-L26) $\rightarrow$ Show `ResponseEntity.status(HttpStatus.CREATED).body(...)`.
- [Dtos.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/java/io/bidvelocity/auth/dto/Dtos.java#L10-L15) $\rightarrow$ Show `@Email`, `@NotBlank`, `@Size(min = 8)` validation records.
- [GlobalExceptionHandler.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/java/io/bidvelocity/auth/web/GlobalExceptionHandler.java#L20-L45) $\rightarrow$ Show `ErrorResponse` DTO mapping.

---

### Component 1.3: Security Implementation (10 Marks)
* **College Rubric Target (10 Marks)**: *"Complete security implementation with JWT validation, role-based authorization, protected endpoints and appropriate security configurations."*

#### 1. What to Show:
- **BCrypt Salting**: Passwords stored in Neon DB are non-reversible hashes with Cost Factor 10 (`$2a$10$...`).
- **Constant-Time Verification**: Show that even if an attacker attempts brute-force login with an unregistered email, the system executes a dummy BCrypt calculation so response times are identical, stopping timing-based user enumeration attacks.
- **RBAC**: Three distinct privilege levels: `USER`, `SELLER`, `ADMIN`.

#### 2. How to Show It (Your Speaking Script):
> *"Our security architecture is zero-trust. All passwords are salted and hashed using BCrypt at work factor 10. In `AuthService.java`, line 125, we prevent timing attacks: if a user is not found, we deliberately run `encoder.matches()` against a dummy hash so an attacker measuring milliseconds cannot infer whether an email exists in our database."*

#### 3. Live PowerShell Commands to Run:
```powershell
# Demonstrate RBAC: Accessing an ADMIN-only endpoint as a normal USER returns 403 Forbidden
try {
    # 1. Login as standard user
    $login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body '{"email":"demo_bidder@bidvelocity.io","password":"Password123!"}' -ContentType "application/json"
    $userToken = $login.token

    # 2. Try accessing admin surveillance stats with user token
    Invoke-RestMethod -Uri "http://localhost:8080/api/admin/stats" -Headers @{ Authorization = "Bearer $userToken" }
} catch {
    Write-Host "Security Block Verified: HTTP $($_.Exception.Response.StatusCode)" -ForegroundColor Green
}
```

#### 4. Exact Code Files to Open in VS Code:
- [SecurityConfig.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/java/io/bidvelocity/auth/security/SecurityConfig.java#L35-L55) $\rightarrow$ Show `authorizeHttpRequests` and `.hasAuthority('ADMIN')`.
- [AuthService.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/java/io/bidvelocity/auth/service/AuthService.java#L125-L135) $\rightarrow$ Show constant-time dummy verification.

---

### Component 1.4: Database Integration and CRUD Operations (10 Marks)
* **College Rubric Target (10 Marks)**: *"Efficient database integration with complete CRUD operations, entity relationships, query methods and proper transaction management."*

#### 1. What to Show:
- Open [Neon Console](https://console.neon.tech) in Chrome $\rightarrow$ Project `tiny-wind-46458939` $\rightarrow$ Left menu **`Postgres database >`** $\rightarrow$ **`Tables`**.
- Show the 12 production tables:
  - `users`, `roles`, `user_roles`, `refresh_tokens`, `auctions`, `bids`, `bid_runtime`, `settlements`, `outbox_events`, `audit_logs`, `flyway_schema_history`.
- Click **`SQL Editor`** and run live queries.

#### 2. How to Show It (Your Speaking Script):
> *"We integrated serverless PostgreSQL 18 hosted on Neon Cloud. Database migrations are strictly managed through Flyway. Hibernate never alters schema at runtime (`ddl-auto: validate`), preventing accidental schema drift. Entity relationships use `@OneToMany` and `@ManyToMany` joins with lazy fetching to prevent N+1 query performance penalties."*

#### 3. Live SQL Queries to Run in Neon Console:
```sql
-- 1. Verify schema migration versioning
SELECT version, description, type, installed_on, state FROM flyway_schema_history;

-- 2. Inspect registered users and roles
SELECT u.id, u.email, u.status, r.name AS role_name FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id;

-- 3. Inspect bid audit ledger
SELECT id, auction_id, bidder_id, amount, status, created_at FROM bids ORDER BY id DESC LIMIT 5;
```

#### 4. Exact Code Files to Open in VS Code:
- [UserRepository.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/java/io/bidvelocity/auth/repo/UserRepository.java#L10-L20) $\rightarrow$ Show Spring Data JPA custom queries.
- [V1__init_auth.sql](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/resources/db/migration/V1__init_auth.sql) $\rightarrow$ Show strict DDL constraints and foreign keys.

---

### Component 1.5: Team Coordination and Code Management (10 Marks)
* **College Rubric Target (10 Marks)**: *"Excellent team collaboration with clearly assigned responsibilities, meaningful commits, proper branch management, conflict resolution and demonstrable individual contributions."*

#### 1. What to Show:
- Open your GitHub Repository: [https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY](https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY).
- Show the **Commit History**: Point out conventional semantic commits (`feat(auth): ...`, `fix(concurrency): ...`, `docs: ...`).
- Show **GitHub Actions CI**: Point out the passing green workflow runs.
- Show **`.gitignore`**: Prove that sensitive environment variables (`.env`, `*.key`, `target/`) are strictly excluded.

#### 2. Live PowerShell Command:
```powershell
cd "c:\bid velocity\Real-Time Distributed Bidding & Auction Clearance Engine"
git log --oneline --graph --decorate -n 10
```

---

# 📙 Part 2: Review 2 — Advanced Implementation, Integration & Testing (50 Marks)

---

### Component 2.1: Microservice Implementation, Discovery & Config (10 Marks)
* **College Rubric Target (10 Marks)**: *"Complete, modular microservices with reliable service discovery, proper configuration and robust error handling."*

#### 1. What to Show:
- Show that each microservice has independent isolation:
  - `services/eureka-server` (Port `8761`)
  - `services/api-gateway` (Port `8080`)
  - `services/auth-service` (Port `8081`)
  - `services/auction-service` (Port `8082`)
  - `services/bidding-service` (Port `8083`)
  - `services/payment-service` (Port `8084`)
- Launch them using `services/start-all.ps1`.

#### 2. Live PowerShell Command:
```powershell
cd "c:\bid velocity\Real-Time Distributed Bidding & Auction Clearance Engine\services"
.\start-all.ps1
```

---

### Component 2.2: JWT Authentication and Security (10 Marks)
* **College Rubric Target (10 Marks)**: *"Robust security with JWT generation, validation, expiration handling, role-based authorization, protected endpoints and appropriate error handling."*

#### 1. What to Show (The Master Feature — Family-Based Token Rotation):
- **Access Token (JWT)**: HMAC-SHA384, 2-hour validity, stateless.
- **Refresh Token**: Stored in Neon PostgreSQL as a SHA-256 hash.
- **Token Reuse Breach Detection**:
  - If a legitimate user refreshes a token, the old token is marked revoked and a new one is issued with the same `family_id`.
  - If a hacker intercepts the old token and attempts to replay it, `RefreshReuseGuard.java` catches `isRevoked() == true` and **instantly revokes all active tokens in that entire family**, destroying the stolen session.

#### 2. How to Show It (Your Speaking Script):
> *"Most student projects use simple long-lived JWTs. We implemented RFC-grade Dual-Token Family Rotation with Breach Detection. If an access token is intercepted, it expires in 2 hours. If a refresh token is stolen and replayed after legitimate renewal, our system detects token reuse, flags a family breach, and atomically destroys every session for that user in Neon DB."*

#### 3. Live PowerShell Commands to Run:
```powershell
# 1. Login to receive initial JWT & Refresh Token
$authResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body '{"email":"admin@bidvelocity.io","password":"AdminPassword123!"}' -ContentType "application/json"
$firstRefreshToken = $authResponse.refreshToken
Write-Host "Original Refresh Token: $firstRefreshToken" -ForegroundColor Cyan

# 2. Legitimate Refresh -> Token is rotated
$rotateResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/refresh" -Method Post -Body (@{ refreshToken = $firstRefreshToken } | ConvertTo-Json) -ContentType "application/json"
$newRefreshToken = $rotateResponse.refreshToken
Write-Host "New Rotated Refresh Token: $newRefreshToken" -ForegroundColor Green

# 3. Attacker Replays the Stolen First Token -> Breach detected & family destroyed
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/auth/refresh" -Method Post -Body (@{ refreshToken = $firstRefreshToken } | ConvertTo-Json) -ContentType "application/json"
} catch {
    Write-Host "Breach Guard Blocked Attacker: HTTP 401 Unauthorized" -ForegroundColor Red
}
```

#### 4. Exact Code Files to Open in VS Code:
- [RefreshReuseGuard.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auth-service/src/main/java/io/bidvelocity/auth/service/RefreshReuseGuard.java#L20-L45) $\rightarrow$ Show atomic family revocation.

---

### Component 2.3: API Gateway and Service Integration (10 Marks)
* **College Rubric Target (10 Marks)**: *"Fully integrated architecture with secure routing, service discovery, load balancing, reliable inter-service communication and appropriate error handling."*

#### 1. What to Show:
- **Header Sanitization Security Filter**: The Gateway strips incoming `X-User-Id` or `X-User-Roles` headers sent by external clients, verifies the JWT signature, and injects verified internal headers downstream. This prevents header-spoofing privilege escalation attacks!

#### 2. Exact Code Files to Open in VS Code:
- [JwtValidationFilter.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/api-gateway/src/main/java/io/bidvelocity/gateway/filters/JwtValidationFilter.java#L50-L75) $\rightarrow$ Show `.mutate().headers(h -> h.remove("X-User-Id"))`.
- [application.yml (Gateway)](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/api-gateway/src/main/resources/application.yml#L15-L35) $\rightarrow$ Show `routes:` matching `lb://AUTH-SERVICE`, `lb://AUCTION-SERVICE`.

---

### Component 2.4: Testing, Validation and Demonstration (10 Marks)
* **College Rubric Target (10 Marks)**: *"Comprehensive unit, integration and contract testing using JUnit 5, AssertJ and Spring Boot Test, with proper validation, extensive test coverage and reliable end-to-end demonstration."*

#### 1. What to Show (Live Automated Test Suite):
- Run `mvn test` live in front of the evaluators.
- Show **all 44 unit and integration tests passing green across all 8 modules**:
  - `eureka-server`: `EurekaServerIntegrationTest`
  - `api-gateway`: `JwtValidationFilterTest`
  - `auth-service`: `DemoUserSeederTest`, `AuthServiceIntegrationTest`
  - `auction-service`: `AuctionLifecycleTest`
  - `bidding-service`: `BidConcurrencyTest`
  - `payment-service`: `PaymentFlowTest`

#### 2. Live PowerShell Command to Run:
```powershell
cd "c:\bid velocity\Real-Time Distributed Bidding & Auction Clearance Engine"
mvn test
```

---

### Component 2.5: Implementation of Tasks Assigned in Review 1 (10 Marks)
* **College Rubric Target (10 Marks)**: *"All tasks assigned during Review 1 are fully implemented, functionally integrated, tested and demonstrated with corresponding GitHub code updates."*

#### 1. What to Show:
Present your structured Review 1-to-Review 2 Progress Table:
- *Review 1 Feedback*: "Connect the API Gateway with Eureka dynamic discovery."  
  $\rightarrow$ **Delivered**: `api-gateway` registered with Eureka and dynamic `lb://` routing implemented.
- *Review 1 Feedback*: "Implement refresh token rotation."  
  $\rightarrow$ **Delivered**: `RefreshReuseGuard.java` with SHA-256 hashing and family-based breach revocation.
- *Review 1 Feedback*: "Add automated concurrency testing."  
  $\rightarrow$ **Delivered**: `BidConcurrencyTest.java` verifying 24-thread simultaneous bid synchronization.

---

# 📕 Part 3: Final Review — Complete Implementation, Deployment & Viva (50 Marks)

---

### Component 3.1: Complete Project Implementation and Functionality (10 Marks)
* **College Rubric Target (10 Marks)**: *"Complete end-to-end application with modular architecture, fully functional business features, proper database integration and successful execution of all major workflows."*

#### 1. The 4-Minute Live Tour (Exact Demonstration Sequence):
1. **Open Live App**: Browse to [https://bidvelocity.vercel.app](https://bidvelocity.vercel.app).
2. **True Email OTP Verification**:
   - Click **Forgot Password**.
   - Enter `harharmahdev003@gmail.com`.
   - Open Gmail live on screen $\rightarrow$ Show the branded **BidVelocity Security** OTP email arriving in seconds without leaking the code on screen.
3. **Live Bidding & Real-Time Sync**:
   - Open an active auction.
   - Place a bid $\rightarrow$ Watch the minimum increment and price update instantaneously without page reload.
4. **Admin Surveillance Dashboard (`/admin`)**:
   - Show User Moderation (one-click suspension).
   - Show Real-Time Bidding Stream with microsecond timestamps and bidder tracking.

---

### Component 3.2: New Feature Development and Integration (10 Marks)
* **College Rubric Target (10 Marks)**: *"Innovative and domain-relevant new feature completely implemented, integrated with existing microservices, validated and demonstrated through working end-to-end functionality."*

#### Signature Innovation 1: Dynamic Anti-Sniping Soft-Close Engine
- **The Problem**: Malicious bots fire bids at $T - 500\text{ ms}$, stealing items before human bidders can react.
- **Our Solution**: If a bid arrives in the final 30 seconds (`extensionWindow`), the engine dynamically extends the auction end time by **+60 seconds** (up to 10 extensions).
- **Code**: [BidService.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/bidding-service/src/main/java/io/bidvelocity/bidding/service/BidService.java#L113-L123)

#### Signature Innovation 2: Transactional Outbox Pattern for Settlement
- **The Problem**: Calling external payment gateways directly inside database transactions causes the Dual-Write Problem. If the network drops, data is inconsistent.
- **Our Solution**: When an auction ends, the winner record and an outbox event (`WINNER_DECLARED`) are committed in the **same local ACID transaction** in Neon PostgreSQL. A background dispatcher delivers the event idempotently.

---

### Component 3.3: Code Quality, Testing and Validation (10 Marks)
* **College Rubric Target (10 Marks)**: *"High-quality implementation following clean coding principles, reusable components, optimized logic, comprehensive testing and reliable application execution."*

#### 1. What to Show (The Dual-Locking Concurrency Engine):
- **Pessimistic Row-Level Lock**: In [BidRuntimeRepository.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/bidding-service/src/main/java/io/bidvelocity/bidding/repo/BidRuntimeRepository.java#L13), `SELECT * FROM bid_runtime WHERE auction_id = :id FOR UPDATE` locks the targeted row.
- **Optimistic Versioning**: In [Auction.java](file:///C:/bid%20velocity/Real-Time%20Distributed%20Bidding%20&%20Auction%20Clearance%20Engine/services/auction-service/src/main/java/io/bidvelocity/auction/domain/Auction.java#L44), `@Version private long version;` guards against stale writes.
- **Atomic Compare-and-Swap (CAS) Acceptance**: The price only increments if `r.currentPrice == expectedPrice`.

#### 2. Live PowerShell Command (Run the Concurrency Stress Test):
```powershell
cd "c:\bid velocity\Real-Time Distributed Bidding & Auction Clearance Engine"
mvn test -pl services/bidding-service -Dtest=BidConcurrencyTest
```

---

### Component 3.4: Cloud Deployment and Infrastructure (10 Marks)
* **College Rubric Target (10 Marks)**: *"Complete cloud deployment with Docker, Terraform/IaC implementation, properly configured infrastructure, successfully running services and a working, accessible deployment URL."*

#### 1. What to Show:
- **Frontend**: Deployed on **Vercel's Global Edge Network** ([https://bidvelocity.vercel.app](https://bidvelocity.vercel.app)).
- **Backend**: Containerized with **Docker** and deployed on **Render Cloud** ([https://bidvelocity-backend.onrender.com](https://bidvelocity-backend.onrender.com)) running Java 21 LTS OpenJDK.
- **Database**: **Neon Serverless PostgreSQL 18** in AWS `us-east-2`.
- **Edge HTTPS Relay**: Render free-tier blocks outbound raw SMTP ports (`25`, `587`). We solved this by architecting an authenticated serverless HTTPS relay on Vercel (`/api/send-code`) operating over Port 443 to dispatch real-time emails to Google SMTP.

#### 2. Live PowerShell Command:
```powershell
# Live Cloud Healthcheck
Invoke-RestMethod -Uri "https://bidvelocity-backend.onrender.com/actuator/health" | ConvertTo-Json
```

---

### Component 3.5: Technical Demonstration, GitHub and Individual Viva (10 Marks)
* **College Rubric Target (10 Marks)**: *"Professional end-to-end demonstration with accessible GitHub repository and deployment URL, complete documentation, strong technical understanding and clear explanation of individual contributions."*

#### 1. What to Show:
- Open your master GitHub README: [https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY](https://github.com/Yogeshcheedalla/REAL-TIME-AUCTIONS.-ZERO-DELAY).
- Show interactive architecture diagrams, badges, and verified test proofs.
- Answer viva questions with high technical authority using the master viva guide below.

---

# 🎓 Master Viva Defense: Senior Architectural Questions & Answers

#### Q1: "Two users submit a bid at the exact same microsecond. Walk me through the exact database transaction lifecycle."
> **Master Answer**:  
> *"1. Both requests hit the Bidding Service concurrently over HTTP.  
> 2. Each thread opens an isolated database transaction and attempts `SELECT * FROM bid_runtime WHERE auction_id = :id FOR UPDATE`.  
> 3. PostgreSQL grants an exclusive row lock to Thread A. Thread B is placed in a non-blocking lock wait state.  
> 4. Thread A verifies that `bidAmount >= currentPrice + minIncrement`. It passes.  
> 5. Thread A executes a Compare-and-Swap update, logs the bid into the immutable `bids` ledger, commits the transaction, and releases the lock.  
> 6. Thread B now acquires the lock and re-evaluates against the newly committed price. Since the price has increased, Thread B's bid is now below the new minimum. It is rejected with HTTP 400 `INVALID_BID`, completely eliminating race conditions and double winners."*

#### Q2: "Why did you implement the Transactional Outbox Pattern instead of calling Payment APIs directly?"
> **Master Answer**:  
> *"In distributed systems, the Dual-Write Problem is fatal: if we update the auction status in PostgreSQL and then call an external payment API over HTTP, the payment API could timeout while the DB update succeeded, or the DB could crash after payment was taken. We cannot use Two-Phase Commit (2PC) because external payment gateways don't support XA transactions.  
> With the Transactional Outbox Pattern, we save the auction `CLOSED` state and an `outbox_events` record in the **same local ACID commit**. An asynchronous dispatcher reads unpublished events and delivers them idempotently. Even if our server crashes mid-flight, no settlement event is ever lost."*

#### Q3: "What happens if a malicious user steals a user's Refresh Token?"
> **Master Answer**:  
> *"We use Family-Based Refresh Token Rotation. When the legitimate user uses their token, the token is invalidated and a new one is issued with the same `familyId`. If an attacker later attempts to replay the stolen, already-revoked token, our `RefreshReuseGuard` detects token reuse immediately. It flags a family compromise and atomically revokes **all** tokens associated with that family, killing all active sessions for both the attacker and the user, forcing a secure re-authentication."*

---
*Created for Yogesh Cheedalla & Team • Real-Time Distributed Bidding & Auction Clearance Engine (BidVelocity)*
