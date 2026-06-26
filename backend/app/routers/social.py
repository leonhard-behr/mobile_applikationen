"""endpoints for friendships, leaderboards, feed, and profiles"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.social import SocialService
from app.schemas.social import (
    FriendRequestCreate,
    FriendshipResponse,
    FriendListItem,
    PendingIncomingRequest,
    PendingOutgoingRequest,
    DailyLeaderboardItem,
    StreakLeaderboardItem,
    FeedItem,
    PublicProfileResponse,
)

router = APIRouter(prefix="/api/social", tags=["social"])


@router.post("/friends/request", response_model=FriendshipResponse)
async def send_friend_request(
    data: FriendRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """send a friend request to another user by username"""

    svc = SocialService(db)
    return await svc.send_friend_request(user.id, data.username)


@router.post("/friends/accept/{request_id}", response_model=FriendshipResponse)
async def accept_friend_request(
    request_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """accept a pending friend request"""

    svc = SocialService(db)
    return await svc.respond_to_request(user.id, request_id, accept=True)


@router.post("/friends/decline/{request_id}", response_model=FriendshipResponse)
async def decline_friend_request(
    request_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """decline a pending friend request"""

    svc = SocialService(db)
    return await svc.respond_to_request(user.id, request_id, accept=False)


@router.delete("/friends/{friend_username}", response_model=dict)
async def remove_friend(
    friend_username: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """remove/unfriend a friend by their username"""

    svc = SocialService(db)
    return await svc.remove_friend(user.id, friend_username)


@router.get("/friends", response_model=List[FriendListItem])
async def get_friends(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """list all accepted friends"""

    svc = SocialService(db)
    return await svc.get_friends_list(user.id)


@router.get("/friends/incoming", response_model=List[PendingIncomingRequest])
async def get_incoming_requests(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """list incoming pending friend requests"""

    svc = SocialService(db)
    return await svc.get_pending_incoming(user.id)


@router.get("/friends/outgoing", response_model=List[PendingOutgoingRequest])
async def get_outgoing_requests(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """list outgoing pending friend requests sent by the user"""

    svc = SocialService(db)
    return await svc.get_pending_outgoing(user.id)


@router.get("/friends/feed", response_model=List[FeedItem])
async def get_social_feed(
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """get recent completed daily challenges of friends"""

    svc = SocialService(db)
    return await svc.get_social_feed(user.id, limit=limit)


@router.get("/leaderboard/daily", response_model=List[DailyLeaderboardItem])
async def get_daily_leaderboard(
    day: Optional[date] = None,
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """get daily leaderboard for a specific date (default date is today)"""
    
    target_day = day or date.today()
    svc = SocialService(db)
    return await svc.get_daily_leaderboard(target_day, limit=limit)


@router.get("/leaderboard/streak", response_model=List[StreakLeaderboardItem])
async def get_streak_leaderboard(
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """get current streak leaderboard of all users"""
    
    svc = SocialService(db)
    return await svc.get_streak_leaderboard(limit=limit)


@router.get("/profile/{username}", response_model=PublicProfileResponse)
async def get_public_profile(
    username: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
    ):
    """get details of another user's public profile"""
    
    svc = SocialService(db)
    return await svc.get_public_profile(username)
