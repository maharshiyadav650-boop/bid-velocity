import sys
import requests
import json

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"

print(f"Testing Admin Capabilities against {BASE_URL}...")

# 1. Login as Admin
login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "admin@bidvelocity.io",
    "password": "Admin@123"
}, timeout=15)

if login_res.status_code != 200:
    print(f"FAILED Admin login: {login_res.status_code} - {login_res.text}")
    sys.exit(1)

auth_data = login_res.json()
token = auth_data["accessToken"]
admin_user = auth_data["user"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"PASS: Logged in as Admin: {admin_user['email']} (ID: {admin_user['id']}), Roles: {admin_user['roles']}")

# 2. Test GET /api/admin/stats
stats_res = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers, timeout=15)
if stats_res.status_code != 200:
    print(f"FAILED GET /api/admin/stats: {stats_res.status_code} - {stats_res.text}")
    sys.exit(1)

stats = stats_res.json()
print("PASS: Admin Stats retrieved:")
print(f"      Total Users: {stats['totalUsers']} (Active: {stats['activeUsers']}, Suspended: {stats['suspendedUsers']}, Sellers: {stats['sellerCount']}, Admins: {stats['adminCount']})")
print(f"      Total Auctions: {stats['totalAuctions']} (Live: {stats['liveAuctions']}, Closed: {stats['closedAuctions']}, Cancelled: {stats['cancelledAuctions']})")
print(f"      Total Bids: {stats['totalBids']}")
print(f"      Platform GMV: ₹{stats['totalGmv']}")
print(f"      Total Payments: {stats['totalPayments']}, Settled: ₹{stats['settledPaymentsAmount']}")

# 3. Test GET /api/admin/users
users_res = requests.get(f"{BASE_URL}/api/admin/users", headers=headers, timeout=15)
if users_res.status_code != 200:
    print(f"FAILED GET /api/admin/users: {users_res.status_code} - {users_res.text}")
    sys.exit(1)

users = users_res.json()
print(f"PASS: Admin Users retrieved: {len(users)} users found.")
target_user = None
for u in users:
    if u["id"] != admin_user["id"]:
        target_user = u
        break

if not target_user:
    print("Warning: No secondary user found to test role toggles.")
else:
    # 4. Test Role Management: Grant SELLER to target_user
    print(f"Testing role update on User #{target_user['id']} ({target_user['email']})...")
    current_roles = list(target_user["roles"])
    new_roles = list(set(current_roles + ["SELLER"]))
    role_res = requests.patch(f"{BASE_URL}/api/admin/users/{target_user['id']}/roles", 
                              headers=headers, json={"roles": new_roles}, timeout=15)
    if role_res.status_code != 200:
        print(f"FAILED PATCH /api/admin/users/{target_user['id']}/roles: {role_res.status_code} - {role_res.text}")
        sys.exit(1)
    
    updated_u = role_res.json()
    assert "SELLER" in updated_u["roles"], "SELLER role should be present"
    print(f"PASS: Granted SELLER to User #{target_user['id']} -> Roles now: {updated_u['roles']}")

    # Restore original roles
    restore_res = requests.patch(f"{BASE_URL}/api/admin/users/{target_user['id']}/roles",
                                 headers=headers, json={"roles": current_roles}, timeout=15)
    assert restore_res.status_code == 200
    print(f"PASS: Restored original roles for User #{target_user['id']} -> Roles now: {restore_res.json()['roles']}")

# 5. Test Safety Guard: Admin cannot revoke their own ADMIN role
demote_res = requests.patch(f"{BASE_URL}/api/admin/users/{admin_user['id']}/roles",
                            headers=headers, json={"roles": ["USER"]}, timeout=15)
if demote_res.status_code == 400:
    print(f"PASS: Self-demotion safely rejected with 400: {demote_res.json().get('message')}")
else:
    print(f"FAILED: Expected 400 on self-demotion, got {demote_res.status_code}")
    sys.exit(1)

# 6. Test GET /api/admin/bids (Live Surveillance feed)
bids_res = requests.get(f"{BASE_URL}/api/admin/bids?size=10", headers=headers, timeout=15)
if bids_res.status_code != 200:
    print(f"FAILED GET /api/admin/bids: {bids_res.status_code} - {bids_res.text}")
    sys.exit(1)

bids = bids_res.json()
print(f"PASS: Admin Live Bids Feed retrieved: {len(bids)} recent bids.")
if bids:
    sample = bids[0]
    print(f"      Sample Bid: #{sample['id']} on '{sample.get('auctionTitle', 'N/A')}' by {sample['bidderName']} for ₹{sample['amount']} ({sample['status']})")

# 7. Test GET /api/payments
pay_res = requests.get(f"{BASE_URL}/api/payments", headers=headers, timeout=15)
if pay_res.status_code != 200:
    print(f"FAILED GET /api/payments: {pay_res.status_code} - {pay_res.text}")
    sys.exit(1)

print(f"PASS: Admin Payments retrieved: {len(pay_res.json())} payments.")
print("\nALL ADMIN CAPABILITIES TESTS PASSED SUCCESSFULLY!")
