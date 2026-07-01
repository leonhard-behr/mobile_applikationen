# tests for redis rate limits (critical paths)
# tests both allowed, rate-limited, disabled, and failure paths.

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from app.infra.redis import redis_client

class MockPipeline:
    def __init__(self, request_count):
        self.request_count = request_count

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    def zremrangebyscore(self, *args, **kwargs):
        pass

    def zcard(self, *args, **kwargs):
        pass

    def zadd(self, *args, **kwargs):
        pass

    def expire(self, *args, **kwargs):
        pass

    async def execute(self):
        # returns the pipeline execution results, where the second item is request_count
        return [None, self.request_count, None, None]

class MockRedis:
    def __init__(self, request_count, should_raise=False):
        self.request_count = request_count
        self.should_raise = should_raise

    def pipeline(self, transaction=True):
        if self.should_raise:
            raise Exception("redis connection lost")
        return MockPipeline(self.request_count)


def test_rate_limit_allowed():
    # test that requests under the limit are allowed through (e.g. returning 404 for non-existent endpoint instead of 429/503)
    orig_enabled = redis_client._enabled
    orig_redis = redis_client._redis
    
    redis_client._enabled = True
    redis_client._redis = MockRedis(50)  # 50 requests (under the 100 limit)
    
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/api/non-existent-endpoint")
        # should pass the rate limiter and get to router (which returns 404 since it doesn't exist)
        assert response.status_code == 404
    finally:
        redis_client._enabled = orig_enabled
        redis_client._redis = orig_redis


def test_rate_limit_exceeded():
    # test that requests over the limit are blocked with 429
    orig_enabled = redis_client._enabled
    orig_redis = redis_client._redis
    
    redis_client._enabled = True
    redis_client._redis = MockRedis(101)  # 101 requests (exceeds the 100 limit)
    
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/api/non-existent-endpoint")
        # should be blocked by rate limiter
        assert response.status_code == 429
        assert response.json() == {"detail": "Too many requests. Please try again later."}
        assert response.headers.get("Retry-After") == "60"
    finally:
        redis_client._enabled = orig_enabled
        redis_client._redis = orig_redis


def test_rate_limit_redis_disabled():
    # test that 503 is returned if redis is disabled
    orig_enabled = redis_client._enabled
    orig_redis = redis_client._redis
    
    redis_client._enabled = False
    
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/api/non-existent-endpoint")
        assert response.status_code == 503
        assert response.json() == {"detail": "Rate limiting service is unavailable."}
    finally:
        redis_client._enabled = orig_enabled
        redis_client._redis = orig_redis


def test_rate_limit_redis_failure():
    # test that 503 is returned if redis fails / raises exception
    orig_enabled = redis_client._enabled
    orig_redis = redis_client._redis
    
    redis_client._enabled = True
    redis_client._redis = MockRedis(50, should_raise=True)
    
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/api/non-existent-endpoint")
        assert response.status_code == 503
        assert response.json() == {"detail": "Rate limiting service is unavailable."}
    finally:
        redis_client._enabled = orig_enabled
        redis_client._redis = orig_redis
