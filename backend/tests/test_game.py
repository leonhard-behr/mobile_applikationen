import pytest

def test_daily_game_start(api_client, unique_id):
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
    response = api_client.get("/api/game/start", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "anchor_word" in data
    assert "session_id" in data
    assert "word_length" in data

def test_guess_and_hints_flow(api_client, unique_id):
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
    start_response = api_client.get("/api/game/start", headers=headers)
    session_id = start_response.json()["session_id"]
    guess_payload = {"word": "haus"}
    guess_response = api_client.post(
        f"/api/game/guess?game_id={session_id}",
        json=guess_payload,
        headers=headers
    )
    assert guess_response.status_code == 200
    guess_data = guess_response.json()
    assert "similarity" in guess_data
    assert "rank" in guess_data
    assert guess_data["word"] == "haus"
    hint_payload = {
        "hint_number": 1,
        "current_best_rank": 5000
    }
    hint_response = api_client.post(
        f"/api/game/hint?game_id={session_id}",
        json=hint_payload,
        headers=headers
    )
    assert hint_response.status_code == 200
    hint_data = hint_response.json()
    assert "word" in hint_data
    assert "rank" in hint_data

def test_empty_guess_edge_case(api_client, unique_id):
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
    start_response = api_client.get("/api/game/start", headers=headers)
    session_id = start_response.json()["session_id"]
    guess_payload = {"word": ""}
    response = api_client.post(
        f"/api/game/guess?game_id={session_id}",
        json=guess_payload,
        headers=headers
    )
    assert response.status_code == 400

def test_duplicate_guess_edge_case(api_client, unique_id):
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
    start_response = api_client.get("/api/game/start", headers=headers)
    session_id = start_response.json()["session_id"]
    guess_payload = {"word": "wasser"}
    api_client.post(
        f"/api/game/guess?game_id={session_id}",
        json=guess_payload,
        headers=headers
    )
    response = api_client.post(
        f"/api/game/guess?game_id={session_id}",
        json=guess_payload,
        headers=headers
    )
    assert response.status_code == 409

def test_hint_limit_edge_case(api_client, unique_id):
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
    start_response = api_client.get("/api/game/start", headers=headers)
    session_id = start_response.json()["session_id"]
    for i in range(1, 4):
        payload = {"hint_number": i, "current_best_rank": 5000}
        api_client.post(
            f"/api/game/hint?game_id={session_id}",
            json=payload,
            headers=headers
        )
    invalid_payload = {"hint_number": 4, "current_best_rank": 5000}
    response = api_client.post(
        f"/api/game/hint?game_id={session_id}",
        json=invalid_payload,
        headers=headers
    )
    assert response.status_code == 422


def test_letters_reveal(api_client, unique_id):
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
    start_response = api_client.get("/api/game/start", headers=headers)
    session_id = start_response.json()["session_id"]
    response = api_client.get(
        f"/api/game/letters?attempts=3&game_id={session_id}",
        headers=headers
    )
    assert response.status_code == 200
    assert "letters" in response.json()
    assert "length" in response.json()

def test_victory_coordinates(api_client, unique_id):
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
    payload = {"words": ["haus", "wasser", "sonne"]}
    response = api_client.post(
        "/api/game/victory",
        json=payload,
        headers=headers
    )
    assert response.status_code == 200
    assert "coordinates" in response.json()

# def test_new_freeplay_game(api_client, unique_id):
#     username = f"user_{unique_id()}"
#     email = f"{username}@example.com"
#     register_payload = {
#         "username": username,
#         "email": email,
#         "password": "SecretPassword123!",
#         "display_name": "Test User"
#     }
#     reg_response = api_client.post("/api/auth/register", json=register_payload)
#     token = reg_response.json()["access_token"]
#     headers = {"Authorization": f"Bearer {token}"}
#     response = api_client.post(
#         "/api/game/new",
#         headers=headers
#     )
#     assert response.status_code == 200
#     assert "game_id" in response.json()

def test_game_history(api_client, unique_id):
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
    response = api_client.get(
        "/api/game/history",
        headers=headers
    )
    assert response.status_code == 200
    assert "games" in response.json()
    assert "total" in response.json()
