"""pydantic request and response schemas for social endpoints"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, date


class FriendRequestCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class FriendshipResponse(BaseModel):
    friendship_id: str
    status: str
    message: str


class FriendListItem(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    xp: int
    level: int
    current_streak: int


class PendingIncomingRequest(BaseModel):
    request_id: str
    sender_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str


class PendingOutgoingRequest(BaseModel):
    request_id: str
    addressee_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str


class DailyLeaderboardItem(BaseModel):
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    total_attempts: int
    hints_used: int
    completed_at: Optional[str] = None
    xp_earned: int


class StreakLeaderboardItem(BaseModel):
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    current_streak: int
    best_streak: int
    level: int
    xp: int


class FeedItem(BaseModel):
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    day: str
    target_word: str
    total_attempts: int
    hints_used: int
    completed_at: Optional[str] = None


class PublicProfileResponse(BaseModel):
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    xp: int
    level: int
    current_streak: int
    best_streak: int
    total_games: int
    completed_games: list[dict]
    achievements: list[dict]
