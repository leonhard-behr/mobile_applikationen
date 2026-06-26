# custom middlewares for FastAPI
# CorrelationIdMiddleware: generates and injects a unique correlation ID into the request header and logs, makes end-to-end request tracing possible
# RateLimitMiddleware: Redis-backed rate limiting middleware using a sliding window algorithm

import time
import uuid
import logging
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.infra.redis import redis_client

logger = logging.getLogger(__name__)

RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW_SECONDS = 60

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    CorrelationIdMiddleware: generates and injects a unique correlation ID into the request header and logs, makes end-to-end request tracing possible
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # gen correlation id if not provided by client
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        
        # save in request state for logger or routers
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        logger.info(f"[{correlation_id}] Request start: {request.method} {request.url.path}")
        
        try:
            response: Response = await call_next(request)
        except Exception as e:
            logger.error(f"[{correlation_id}] Request failed: {e}", exc_info=True)
            raise e
            
        process_time = (time.time() - start_time) * 1000
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
        
        logger.info(f"[{correlation_id}] Request end: status={response.status_code} time={process_time:.2f}ms")
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed rate limiting middleware using a sliding window algorithm.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        # client IP
        client_ip = request.client.host if request.client else "unknown_ip"
        
        if not redis_client._enabled or not redis_client._redis:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Rate limiting service is unavailable.",
            )

        now = time.time()
        key = f"ratelimit:{client_ip}"
        clear_before = now - RATE_LIMIT_WINDOW_SECONDS

        try:
            async with redis_client._redis.pipeline(transaction=True) as pipe:

                pipe.zremrangebyscore(key, 0, clear_before)     # removing old timestamps
                pipe.zcard(key)                                 # counting requests
                pipe.zadd(key, {str(now): now})                 # adding current timestamp
                pipe.expire(key, RATE_LIMIT_WINDOW_SECONDS + 10) # set ttl to avoid leaks
                
                _, request_count, _, _ = await pipe.execute()

            # checking limit
            if request_count > RATE_LIMIT_REQUESTS:
                correlation_id = getattr(request.state, "correlation_id", "unknown")
                logger.warning(f"[{correlation_id}] Rate limit exceeded for IP: {client_ip} ({request_count}/{RATE_LIMIT_REQUESTS})")
                
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many requests. Please try again later."},
                    headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)}
                )

        except Exception as e:
            logger.error(f"Rate limiting failure: {e}")

            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Rate limiting service is unavailable.",
            )
            
        return await call_next(request)
