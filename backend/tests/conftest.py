import os
import uuid
import pytest
import httpx

@pytest.fixture(scope="session")
def base_url():
    return os.getenv("TEST_BASE_URL", "http://localhost:6000")

@pytest.fixture
def unique_id():
    return lambda: uuid.uuid4().hex[:10]

@pytest.fixture
def api_client(base_url):
    with httpx.Client(base_url=base_url, timeout=10.0) as client:
        yield client
