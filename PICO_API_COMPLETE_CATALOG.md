# 🚀 BidVelocity: Complete Pico API / REST Client Testing Manual
## Copy-Paste Ready API Catalog for Chrome Pico API

> **Base URL**: `https://bidvelocity-backend.onrender.com`  
> **Status**: **LIVE & READY** (`status: UP`)

---

## 📌 How to Use Pico API in Chrome (Quick Tips):
1. **Method**: Select `GET`, `POST`, or `PATCH` from the dropdown on the left.
2. **URL**: Paste the exact URL from below into the text box.
3. **Headers Tab**: Click **Headers** $\rightarrow$ Add `Content-Type: application/json`. For authenticated APIs, add `Authorization: Bearer <YOUR_JWT_TOKEN>`.
4. **Body Tab**: Click **Body** $\rightarrow$ Select **`raw`** $\rightarrow$ Ensure **`JSON`** is selected on the right $\rightarrow$ Paste the JSON body.
5. **Send**: Click the green **Send** button on the right!

---

## 🔑 STEP 1: Admin Login (Get Your JWT Token First!)
*Run this first to get your JWT access token. You will use this token for all protected APIs below!*

* **Method**: `POST`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/auth/login
  ```
* **Headers**:
  * `Content-Type`: `application/json`
* **Body (`raw` -> `JSON`)**:
  ```json
  {
    "email": "admin@bidvelocity.io",
    "password": "Admin@123"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzM4NCIsInR5cCI...",
    "refreshToken": "Rj1cMGGd6o1fYEA3t3j1cm...",
    "expiresInSeconds": 7200,
    "user": {
      "id": 1,
      "email": "admin@bidvelocity.io",
      "firstName": "Admin",
      "lastName": "",
      "status": "ACTIVE",
      "roles": ["ADMIN", "SELLER", "USER"]
    }
  }
  ```
👉 **ACTION**: Copy the value of `"accessToken"` from the response! You will paste it as `Bearer <token>` in the APIs below.

---

## 👤 STEP 2: Register a New User (Prove 201 Created)
*Shows faculty RFC HTTP status codes and automatic role assignment.*

* **Method**: `POST`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/auth/register
  ```
* **Headers**:
  * `Content-Type`: `application/json`
* **Body (`raw` -> `JSON`)**:
  ```json
  {
    "firstName": "Faculty",
    "lastName": "Reviewer",
    "email": "reviewer_unique_01@bidvelocity.io",
    "password": "SecurePassword123!",
    "termsAccepted": true
  }
  ```
* **Expected Status**: `201 Created`
* **Expected Response**: Returns the new user DTO with ID and an accessToken.

---

## 🔄 STEP 3: Refresh Token & Family Rotation (Review 2 Security Rubric)
*Demonstrates Dual-Token Security: rotation of refresh tokens and breach detection.*

* **Method**: `POST`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/auth/refresh
  ```
* **Headers**:
  * `Content-Type`: `application/json`
* **Body (`raw` -> `JSON`)**:
  *(Paste the refreshToken you received from Step 1)*
  ```json
  {
    "refreshToken": "PASTE_REFRESH_TOKEN_HERE"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: Returns a brand-new access token and a newly rotated refresh token.

---

## 📧 STEP 4: Forgot Password (Real Google OTP to Gmail)
*Dispatches a real OTP to Gmail over secure Port 443.*

* **Method**: `POST`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/auth/forgot-password
  ```
* **Headers**:
  * `Content-Type`: `application/json`
* **Body (`raw` -> `JSON`)**:
  ```json
  {
    "email": "harharmahdev003@gmail.com"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**:
  ```json
  {
    "status": "SENT",
    "message": "Verification code sent to email"
  }
  ```
👉 *Notice: The OTP code is NEVER leaked in the response, guaranteeing zero leak security.*

---

## 🆔 STEP 5: Get Authenticated User Profile
*Validates the JWT token at the API Gateway.*

* **Method**: `GET`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/users/me
  ```
* **Headers**:
  * `Authorization`: `Bearer PASTE_YOUR_JWT_TOKEN_HERE`
* **Body**: *(Leave empty)*
* **Expected Status**: `200 OK`
* **Expected Response**: Returns your user ID, email, name, and role claims.

---

## ⭐ STEP 6: Upgrade Account to Seller
*Elevates the signed-in user to SELLER and issues a refreshed JWT with updated claims.*

* **Method**: `POST`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/users/me/seller
  ```
* **Headers**:
  * `Authorization`: `Bearer PASTE_YOUR_JWT_TOKEN_HERE`
* **Body**: *(Leave empty)*
* **Expected Status**: `200 OK`
* **Expected Response**: Returns refreshed JWT with `"SELLER"` authority added.

---

## 🛒 STEP 7: Search Marketplace Auctions
*Public marketplace endpoint with pagination, sorting, and category filters.*

* **Method**: `GET`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/auctions?page=0&size=10&sort=endTime
  ```
* **Headers**: *(None required)*
* **Body**: *(Leave empty)*
* **Expected Status**: `200 OK`
* **Expected Response**:
  ```json
  {
    "content": [
      {
        "id": 1,
        "title": "Vintage Mechanical Watch",
        "startingPrice": 250.00,
        "currentPrice": 420.00,
        "minIncrement": 10.00,
        "status": "LIVE",
        "bidCount": 14
      }
    ],
    "totalElements": 25
  }
  ```

---

## 📦 STEP 8: Create a New Auction Lot (Seller/Admin Only)
*Demonstrates RBAC protection and entity persistence in Neon DB.*

* **Method**: `POST`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/auctions
  ```
* **Headers**:
  * `Content-Type`: `application/json`
  * `Authorization`: `Bearer PASTE_YOUR_JWT_TOKEN_HERE`
* **Body (`raw` -> `JSON`)**:
  ```json
  {
    "title": "Pico API Luxury Chronograph",
    "description": "Mint condition automated lot created via Pico API REST client.",
    "category": "Watches",
    "startingPrice": 500.00,
    "minIncrement": 25.00,
    "durationMinutes": 120
  }
  ```
* **Expected Status**: `201 Created`
* **Expected Response**: Returns the created auction with its generated database ID.

---

## 🔨 STEP 9: Place a Concurrency-Protected Bid
*The flagship technical feature: Pessimistic Row Lock (`FOR UPDATE`) + CAS update.*

* **Method**: `POST`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/bids
  ```
* **Headers**:
  * `Content-Type`: `application/json`
  * `Authorization`: `Bearer PASTE_YOUR_JWT_TOKEN_HERE`
* **Body (`raw` -> `JSON`)**:
  ```json
  {
    "auctionId": 1,
    "amount": 550.00,
    "idempotencyKey": "pico-bid-1001"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**:
  ```json
  {
    "bidId": 89,
    "auctionId": 1,
    "amount": 550.00,
    "status": "ACCEPTED",
    "extended": false
  }
  ```
*(If the bid is below the minimum required, it returns HTTP 400 with `BELOW_MINIMUM` error)*

---

## 📜 STEP 10: Get Bid History for an Auction
*Returns recent accepted bids in descending chronological order.*

* **Method**: `GET`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/bids/auction/1?size=30
  ```
* **Headers**: *(None required)*
* **Body**: *(Leave empty)*
* **Expected Status**: `200 OK`
* **Expected Response**: Array of bids showing bidder IDs, amounts, and exact timestamps.

---

## 📊 STEP 11: Admin Platform Overview Statistics (Admin Only)
*Shows platform telemetry: GMV, live/closed auctions, user counts, and settled volumes.*

* **Method**: `GET`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/admin/stats
  ```
* **Headers**:
  * `Authorization`: `Bearer PASTE_YOUR_JWT_TOKEN_HERE`
* **Body**: *(Leave empty)*
* **Expected Status**: `200 OK`
* **Expected Response**:
  ```json
  {
    "totalUsers": 128,
    "activeUsers": 126,
    "suspendedUsers": 2,
    "sellerCount": 34,
    "adminCount": 3,
    "totalAuctions": 45,
    "liveAuctions": 12,
    "closedAuctions": 31,
    "totalBids": 842,
    "totalGmv": 48250.00,
    "totalPayments": 29,
    "settledPaymentsAmount": 42100.00
  }
  ```

---

## 🚫 STEP 12: Admin Suspend a User (Security Enforcement)
*Atomically changes status to SUSPENDED and revokes their refresh token family.*

* **Method**: `PATCH`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/admin/users/2/status
  ```
* **Headers**:
  * `Content-Type`: `application/json`
  * `Authorization`: `Bearer PASTE_YOUR_JWT_TOKEN_HERE`
* **Body (`raw` -> `JSON`)**:
  ```json
  {
    "status": "SUSPENDED"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: Returns the user object with `"status": "SUSPENDED"`.

---

## 📡 STEP 13: Admin Live Bidding Feed (Surveillance Stream)
*Real-time surveillance audit feed showing every bid placed across all auctions.*

* **Method**: `GET`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/api/admin/bids?size=50
  ```
* **Headers**:
  * `Authorization`: `Bearer PASTE_YOUR_JWT_TOKEN_HERE`
* **Body**: *(Leave empty)*
* **Expected Status**: `200 OK`
* **Expected Response**: Array of recent bids with auction titles, amounts, and statuses.

---

## 💚 STEP 14: Actuator Health Check
*Microservice observability & health probe.*

* **Method**: `GET`
* **URL**:
  ```
  https://bidvelocity-backend.onrender.com/actuator/health
  ```
* **Headers**: *(None required)*
* **Body**: *(Leave empty)*
* **Expected Status**: `200 OK`
* **Expected Response**: `{"status": "UP"}`
