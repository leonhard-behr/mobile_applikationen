"""Auth router for /api/auth/*
Handles: 
registration, login, token refresh, profile retrieval, profile update, account deletion
"""

from fastapi import APIRouter, Depends, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_db, get_current_user
from app.core.exceptions import TokenInvalid
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UpdateProfileRequest,
    TokenResponse,
    UserResponse,
    MessageResponse,
)
from app.services.auth import AuthService

settings = get_settings()

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_KEY = "refresh_token"
REFRESH_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


def _set_refresh_cookie(response: Response, token: str) -> None:
    """sets the refresh token as an HttpOnly cookie"""
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=token,
        httponly=True,
        secure=True,        # TODO: set to True for production!!!
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/auth",
    )



def _clear_refresh_cookie(response: Response) -> None:
    """deletes the refresh token cookie"""
    response.delete_cookie(
        key=REFRESH_COOKIE_KEY,
        path="/api/auth",
    )



@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """creates a new account and returns tokens"""
    svc = AuthService(db)
    user, access_token, refresh_token = await svc.register(
        username=req.username,
        email=req.email,
        password=req.password,
        display_name=req.display_name,
    )
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)




@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """authenticates with username + password, receive tokens"""
    svc = AuthService(db)
    user, access_token, refresh_token = await svc.login(
        username=req.username,
        password=req.password,
    )
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)




@router.post("/refresh", response_model=TokenResponse)
async def refresh(response: Response, db: AsyncSession = Depends(get_db), refresh_token: str | None = Cookie(None, alias=REFRESH_COOKIE_KEY)):
    """uses the refresh cookie to get a new access token"""
    if refresh_token is None:
        raise TokenInvalid("No refresh token cookie found.")

    svc = AuthService(db)
    user, access_token = await svc.refresh(refresh_token)

    # TODO: sliding expiry for refresh token
    # _set_refresh_cookie(response, new_refresh_token)

    return TokenResponse(access_token=access_token)



@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    """clears the refresh cookie (client discard access token)"""
    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out successfully.")



@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """returns authenticated users profile"""
    return user



@router.patch("/me", response_model=UserResponse)
async def update_me(req: UpdateProfileRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """updates authenticated users profile"""
    svc = AuthService(db)
    updated = await svc.update_profile(
        user,
        display_name=req.display_name,
        is_public=req.is_public,
    )
    return updated



@router.delete("/me", response_model=MessageResponse)
async def delete_me(response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """soft-deletes the authenticated users account"""
    svc = AuthService(db)
    await svc.delete_account(user)
    _clear_refresh_cookie(response)
    return MessageResponse(message="Account deleted.")
