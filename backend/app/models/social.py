"""Social models: Achievement, Friendship"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Achievement(Base):
    """Badge earned by a user (key-based, extensible without schema changes)"""

    __tablename__ = "achievements"
    # EACH ACHIEVEMENT CAN ONLY BE EARNED ONCE BY EACH USER
    __table_args__ = (UniqueConstraint("user_id", "achievement_key", name="uq_user_achievement"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    achievement_key: Mapped[str] = mapped_column(String(50), nullable=False, index=True,comment="Machine key, e.g. 'streak_7', 'under_3'")
    achievement_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    earned_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="achievements")

    def __repr__(self) -> str:
        return f"<Achievement '{self.achievement_key}' for user={self.user_id}>"


class Friendship(Base):
    """Directional friend request: pending -> accepted / blocked."""

    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
        Index("ix_friendships_addressee", "addressee_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    requester_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    addressee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, comment="pending | accepted | blocked")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    requester: Mapped["User"] = relationship(foreign_keys=[requester_id])
    addressee: Mapped["User"] = relationship(foreign_keys=[addressee_id])

    def __repr__(self) -> str:
        return f"<Friendship {self.requester_id} -> {self.addressee_id} ({self.status})>"
