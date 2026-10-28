import urllib.request
import urllib.parse
import json
import time
import sys
import io

# Force UTF-8 on Windows stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "https://bidvelocity-backend.onrender.com"

def request(method, path, body=None, token=None):
    url = BASE_URL + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            res_body = res.read().decode("utf-8")
            try:
                return res.status, json.loads(res_body)
            except Exception:
                return res.status, res_body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def run_tests():
    print(f"=== Comprehensive Live End-to-End Verification on {BASE_URL} ===\n")
    
    # 1. Health & Infrastructure Diagnostics
    status, res = request("GET", "/actuator/health")
    print(f"[1] Health Check (/actuator/health): {status} -> {res}")
    assert status == 200 and res.get("status") == "UP"
        
    status, res = request("GET", "/_logs/memory.txt")
    print(f"[2] Container Memory Diagnostics: {status}")
    if status == 200:
        first_line = str(res).splitlines()[0] if str(res).splitlines() else str(res)
        print("    ", first_line[:80].strip())
        
    status, res = request("GET", "/_logs/platform.log")
    print(f"[3] Unified Platform Service Log: {status}")
    assert status == 200
    
    # 2. Admin APIs & System Management
    print("\n--- Admin APIs ---")
    status, res = request("POST", "/api/auth/login", {"email": "admin@bidvelocity.io", "password": "Admin@123"})
    print(f"[4.1] Admin Login (POST /api/auth/login): {status}")
    admin_token = res.get("accessToken")
    assert admin_token, f"Failed admin login: {res}"
    
    status, users = request("GET", "/api/admin/users", token=admin_token)
    print(f"[4.2] List Users (GET /api/admin/users): {status} -> Total users registered: {len(users)}")
    assert status == 200 and isinstance(users, list)

    status, all_payments = request("GET", "/api/payments", token=admin_token)
    print(f"[4.3] Admin View All Invoices (GET /api/payments): {status} -> Count: {len(all_payments)}")
    assert status == 200 and isinstance(all_payments, list)

    # 3. User Registration, Profile & Seller Upgrade
    ts = int(time.time())
    seller_email = f"seller_{ts}@example.com"
    buyer_email = f"buyer_{ts}@example.com"
    pwd = "Password123!"
    
    print("\n--- Auth & User Lifecycle ---")
    seller_reg_payload = {
        "firstName": "Vikram",
        "lastName": "Seller",
        "email": seller_email,
        "password": pwd,
        "role": "USER",
        "termsAccepted": True
    }
    status, res = request("POST", "/api/auth/register", seller_reg_payload)
    print(f"[5.1] Register New User (POST /api/auth/register): {status} -> User ID {res.get('user', {}).get('id')}")
    assert status == 201
    seller_token = res.get("accessToken")
    
    status, profile = request("GET", "/api/users/me", token=seller_token)
    print(f"[5.2] View Current Profile (GET /api/users/me): {status} -> Name='{profile.get('firstName')} {profile.get('lastName')}', Roles={profile.get('roles')}")
    assert status == 200 and profile.get("roles") == ["USER"]
    
    # Test "Become a Seller" button
    status, res = request("POST", "/api/users/me/seller", token=seller_token)
    print(f"[5.3] 'Become a Seller' Button (POST /api/users/me/seller): {status} -> Upgraded Roles={res.get('user', {}).get('roles')}")
    assert status == 200
    seller_token = res.get("accessToken") # Updated JWT with SELLER role
    
    # Register Buyer
    buyer_reg_payload = {
        "firstName": "Riya",
        "lastName": "Bidder",
        "email": buyer_email,
        "password": pwd,
        "role": "USER",
        "termsAccepted": True
    }
    status, res = request("POST", "/api/auth/register", buyer_reg_payload)
    print(f"[5.4] Register Buyer User (POST /api/auth/register): {status} -> User ID {res.get('user', {}).get('id')}")
    assert status == 201
    buyer_token = res.get("accessToken")

    # 4. Auction Creation & Marketplace Discovery
    print("\n--- Auction & Marketplace Engine ---")
    # Fetch marketplace
    status, page = request("GET", "/api/auctions")
    items = page.get("content", [])
    print(f"[6.1] Marketplace Feed (GET /api/auctions): {status} -> Total items={page.get('totalElements')}")
    assert status == 200
    
    # Filter by category
    status, page_filtered = request("GET", "/api/auctions?category=Electronics")
    print(f"[6.2] Filter By Category (GET /api/auctions?category=Electronics): {status} -> Found={page_filtered.get('totalElements')}")
    assert status == 200

    # Create a new live auction as the seller
    now = int(time.time())
    start_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now - 30))
    end_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now + 1800))
    create_payload = {
        "title": f"MacBook Pro M3 Max {ts}",
        "description": "Factory sealed space black 16-inch 36GB 1TB SSD",
        "category": "Electronics",
        "emoji": "💻",
        "imageUrl": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
        "startingPrice": 2000.0,
        "minIncrement": 100.0,
        "reservePrice": 2500.0,
        "startTime": start_iso,
        "endTime": end_iso,
        "antiSnipingEnabled": True,
        "extensionWindowSeconds": 30,
        "maxExtensions": 3
    }
    status, new_auction = request("POST", "/api/auctions", create_payload, token=seller_token)
    print(f"[6.3] 'Publish Auction' Button (POST /api/auctions): {status} -> Created Auction #{new_auction.get('id')}: '{new_auction.get('title')}'")
    assert status == 201
    aid = new_auction.get("id")

    # View auction detail page
    status, a_detail = request("GET", f"/api/auctions/{aid}")
    print(f"[6.4] View Auction Details (GET /api/auctions/{aid}): {status} -> Status={a_detail.get('status')}, Price=₹{a_detail.get('currentPrice')}, MinNext=₹{a_detail.get('minNextBid')}")
    assert status == 200

    # View seller's own auctions ("My Auctions")
    status, my_auctions = request("GET", "/api/auctions/mine", token=seller_token)
    print(f"[6.5] Seller 'My Auctions' (GET /api/auctions/mine): {status} -> Count={len(my_auctions)}")
    assert status == 200 and any(a.get("id") == aid for a in my_auctions)

    # 5. Live Bidding Engine & WebSocket
    print("\n--- Bidding Engine & Real-Time Feed ---")
    # Verify live bid activity list (was returning 502 in user screenshot!)
    status, bids = request("GET", f"/api/bids/auction/{aid}")
    print(f"[7.1] Initial Bid Activity (GET /api/bids/auction/{aid}): {status} -> Count={len(bids)}")
    assert status == 200 and isinstance(bids, list)

    # Verify STOMP WebSocket SockJS handshake
    status, ws_info = request("GET", "/ws/info")
    print(f"[7.2] STOMP WebSocket /ws endpoint (GET /ws/info): {status} -> websocket={ws_info.get('websocket')}")
    assert status == 200 and ws_info.get("websocket") is True

    # Place Bid 1 using Buyer account ("BID NOW" button)
    bid1_amount = float(a_detail.get("minNextBid") or 2100.0)
    bid1_payload = {
        "auctionId": aid,
        "amount": bid1_amount,
        "idempotencyKey": f"idemp-{ts}-bid-1"
    }
    status, bid1_res = request("POST", "/api/bids", bid1_payload, token=buyer_token)
    print(f"[7.3] 'BID NOW' Button (POST /api/bids with ₹{bid1_amount}): {status} -> Accepted! New Top Bid=₹{bid1_res.get('bid', {}).get('amount')}")
    assert status in [200, 201]

    # Verify outbid scenario: Place Bid 2 with an even higher increment
    bid2_amount = bid1_amount + 200.0
    bid2_payload = {
        "auctionId": aid,
        "amount": bid2_amount,
        "idempotencyKey": f"idemp-{ts}-bid-2"
    }
    status, bid2_res = request("POST", "/api/bids", bid2_payload, token=buyer_token)
    print(f"[7.4] Quick Increment Bid (POST /api/bids with ₹{bid2_amount}): {status} -> Accepted! New Top Bid=₹{bid2_res.get('bid', {}).get('amount')}")
    assert status in [200, 201]

    # Verify updated live bid activity feed
    status, updated_bids = request("GET", f"/api/bids/auction/{aid}")
    print(f"[7.5] Updated Bid Activity Feed (GET /api/bids/auction/{aid}): {status} -> Total bids: {len(updated_bids)}")
    assert status == 200 and len(updated_bids) == 2

    # Verify Buyer's "My Bids" page
    status, my_bids = request("GET", "/api/bids/my", token=buyer_token)
    print(f"[7.6] Buyer 'My Bids' Page (GET /api/bids/my): {status} -> Count={len(my_bids)}")
    assert status == 200 and len(my_bids) >= 2

    # 6. Payments Engine
    print("\n--- Payments Engine ---")
    # Verify Buyer's "Payments" tab
    status, my_payments = request("GET", "/api/payments/my", token=buyer_token)
    print(f"[8.1] Buyer 'Payments' Tab (GET /api/payments/my): {status} -> Invoices: {len(my_payments)}")
    assert status == 200 and isinstance(my_payments, list)

    # Verify Seller's "Payments / Invoices" tab
    status, seller_payments = request("GET", "/api/payments/seller", token=seller_token)
    print(f"[8.2] Seller 'Payments' Tab (GET /api/payments/seller): {status} -> Invoices: {len(seller_payments)}")
    assert status == 200 and isinstance(seller_payments, list)

    print("\n" + "=" * 60)
    print("ALL PRODUCTION APIS, BUTTONS & FLOWS VERIFIED SUCCESSFULLY!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
