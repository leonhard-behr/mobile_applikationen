import pytest

def test_registration_flow(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    response = api_client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    assert "access_token" in response.json()
    assert "refresh_token" in response.cookies

def test_login_flow(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    register_payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    api_client.post("/api/auth/register", json=register_payload)
    login_payload = {
        "username": username,
        "password": "SecretPassword123!"
    }
    response = api_client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.cookies

def test_me_endpoint(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    register_payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    reg_response = api_client.post("/api/auth/register", json=register_payload)
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    response = api_client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == username
    assert response.json()["email"] == email

def test_update_me_profile(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    register_payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    reg_response = api_client.post("/api/auth/register", json=register_payload)
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    update_payload = {
        "display_name": "Updated Name",
        "avatar_url": "http://example.com/avatar.jpg",
        "is_public": False
    }
    response = api_client.patch("/api/auth/me", json=update_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["display_name"] == "Updated Name"

def test_refresh_token(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    register_payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    api_client.post("/api/auth/register", json=register_payload)
    response = api_client.post("/api/auth/refresh")
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_logout(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    register_payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    api_client.post("/api/auth/register", json=register_payload)
    response = api_client.post("/api/auth/logout")
    assert response.status_code == 200
    assert "refresh_token" not in response.cookies

def test_register_duplicate_username(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    api_client.post("/api/auth/register", json=payload)
    duplicate_payload = {
        "username": username,
        "email": f"other_{email}",
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    response = api_client.post("/api/auth/register", json=duplicate_payload)
    assert response.status_code == 409

def test_register_duplicate_email(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    api_client.post("/api/auth/register", json=payload)
    duplicate_payload = {
        "username": f"other_{username}",
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    response = api_client.post("/api/auth/register", json=duplicate_payload)
    assert response.status_code == 409

def test_login_invalid_password(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    register_payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    api_client.post("/api/auth/register", json=register_payload)
    login_payload = {
        "username": username,
        "password": "WrongPassword123!"
    }
    response = api_client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401

def test_me_unauthorized(api_client):
    response = api_client.get("/api/auth/me")
    assert response.status_code == 401

def test_delete_account(api_client, unique_id):
    username = f"user_{unique_id()}"
    email = f"{username}@example.com"
    register_payload = {
        "username": username,
        "email": email,
        "password": "SecretPassword123!",
        "display_name": "Test User"
    }
    reg_response = api_client.post("/api/auth/register", json=register_payload)
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    response = api_client.delete("/api/auth/me", headers=headers)
    assert response.status_code == 200
    me_response = api_client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 404

