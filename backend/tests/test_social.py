import pytest

def test_friend_request_flow(api_client, unique_id):
    u1 = f"user_{unique_id()}"
    p1 = {
        "username": u1,
        "email": f"{u1}@example.com",
        "password": "SecretPassword123!",
        "display_name": "User One"
    }
    r1 = api_client.post("/api/auth/register", json=p1)
    t1 = r1.json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}
    
    u2 = f"user_{unique_id()}"
    p2 = {
        "username": u2,
        "email": f"{u2}@example.com",
        "password": "SecretPassword123!",
        "display_name": "User Two"
    }
    r2 = api_client.post("/api/auth/register", json=p2)
    t2 = r2.json()["access_token"]
    h2 = {"Authorization": f"Bearer {t2}"}

    req_response = api_client.post(
        "/api/social/friends/request",
        json={"username": u2},
        headers=h1
    )
    assert req_response.status_code == 200
    req_data = req_response.json()
    assert "friendship_id" in req_data
    req_id = req_data["friendship_id"]

    inc_response = api_client.get("/api/social/friends/incoming", headers=h2)
    assert inc_response.status_code == 200
    assert any(item["request_id"] == req_id for item in inc_response.json())

    accept_response = api_client.post(
        f"/api/social/friends/accept/{req_id}",
        headers=h2
    )
    assert accept_response.status_code == 200

    friends_response = api_client.get("/api/social/friends", headers=h1)
    assert friends_response.status_code == 200
    assert any(f["username"] == u2 for f in friends_response.json())

def test_self_friend_request_edge_case(api_client, unique_id):
    username = f"user_{unique_id()}"
    payload = {
        "username": username,
        "email": f"{username}@example.com",
        "password": "SecretPassword123!",
        "display_name": "Self Friend"
    }
    reg_response = api_client.post("/api/auth/register", json=payload)
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    response = api_client.post(
        "/api/social/friends/request",
        json={"username": username},
        headers=headers
    )
    assert response.status_code == 400

def test_duplicate_friend_request_edge_case(api_client, unique_id):
    u1 = f"user_{unique_id()}"
    p1 = {
        "username": u1,
        "email": f"{u1}@example.com",
        "password": "SecretPassword123!"
    }
    r1 = api_client.post("/api/auth/register", json=p1)
    t1 = r1.json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}
    
    u2 = f"user_{unique_id()}"
    p2 = {
        "username": u2,
        "email": f"{u2}@example.com",
        "password": "SecretPassword123!"
    }
    api_client.post("/api/auth/register", json=p2)

    api_client.post(
        "/api/social/friends/request",
        json={"username": u2},
        headers=h1
    )
    response = api_client.post(
        "/api/social/friends/request",
        json={"username": u2},
        headers=h1
    )
    assert response.status_code == 409

def test_social_leaderboards_and_feed(api_client, unique_id):
    username = f"user_{unique_id()}"
    payload = {
        "username": username,
        "email": f"{username}@example.com",
        "password": "SecretPassword123!"
    }
    reg_response = api_client.post("/api/auth/register", json=payload)
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    daily_res = api_client.get("/api/social/leaderboard/daily", headers=headers)
    assert daily_res.status_code == 200
    
    streak_res = api_client.get("/api/social/leaderboard/streak", headers=headers)
    assert streak_res.status_code == 200

    feed_res = api_client.get("/api/social/friends/feed", headers=headers)
    assert feed_res.status_code == 200

def test_public_vs_private_profile(api_client, unique_id):
    u1 = f"user_{unique_id()}"
    p1 = {
        "username": u1,
        "email": f"{u1}@example.com",
        "password": "SecretPassword123!"
    }
    r1 = api_client.post("/api/auth/register", json=p1)
    t1 = r1.json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}
    
    u2 = f"user_{unique_id()}"
    p2 = {
        "username": u2,
        "email": f"{u2}@example.com",
        "password": "SecretPassword123!"
    }
    api_client.post("/api/auth/register", json=p2)

    api_client.patch(
        "/api/auth/me",
        json={"is_public": False},
        headers=h1
    )
    
    response = api_client.get(
        f"/api/social/profile/{u1}",
        headers=h1
    )
    assert response.status_code == 403

    api_client.patch(
        "/api/auth/me",
        json={"is_public": True},
        headers=h1
    )
    response_public = api_client.get(
        f"/api/social/profile/{u1}",
        headers=h1
    )
    assert response_public.status_code == 200
