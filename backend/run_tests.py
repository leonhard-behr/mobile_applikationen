import sys
import os
import httpx

base_url = os.getenv("TEST_BASE_URL", "http://localhost:6000")

print(40*"--")
print(base_url)
print(40*"--")

try:
    response = httpx.get(f"{base_url}/api/health", timeout=5.0)
    if response.status_code != 200:
        sys.exit(1)
except Exception:
    sys.exit(1)

import pytest
args = ["-v", "tests"]
sys.exit(pytest.main(args))
