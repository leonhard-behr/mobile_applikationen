"""pydantic schemas"""

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class GuessRequest(BaseModel):
    word: str


class HintRequest(BaseModel):
    hint_number: int = Field(..., ge=1, le=3)
    current_best_rank: int | None = None


class VictoryRequest(BaseModel):
    words: list[str]


class StartResponse(BaseModel):
    anchor_word: str
    anchor_similarity: float
    anchor_rank: int | None
    today: str
    total_ranked: int
    letters: list[str]
    word_length: int
    session_id: str | None = None
    guesses: list["GuessItem"] | None = None
    won: bool = False
    hints: list["HintItem"] | None = None
    hints_used: int = 0
    penalty_attempts: int = 0


class GuessResponse(BaseModel):
    word: str
    similarity: float
    scaled_similarity: float
    rank: int | None
    total_ranked: int
    is_correct: bool
    letters: list[str]
    word_length: int


class HintResponse(BaseModel):
    hint_number: int
    rank: int
    word: str


class LettersResponse(BaseModel):
    letters: list[str]
    length: int


class Coordinate(BaseModel):
    word: str
    x: float
    y: float


class VictoryResponse(BaseModel):
    coordinates: list[Coordinate]


class NewGameResponse(BaseModel):
    anchor_word: str
    anchor_similarity: float
    anchor_rank: int | None
    today: str
    game_id: str
    total_ranked: int
    letters: list[str]
    word_length: int


class GuessItem(BaseModel):
    word: str
    similarity: float
    scaled_similarity: float
    rank: int | None
    is_correct: bool

    model_config = {"from_attributes": True}


class HintItem(BaseModel):
    hint_number: int
    rank: int
    word: str
    model_config = {"from_attributes": True}


class GameHistoryItem(BaseModel):
    day: str
    won: bool
    total_attempts: int
    hints_used: int
    target_word: str | None = None  # ONLY REVEALED WHEN WON
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class GameHistoryResponse(BaseModel):
    games: list[GameHistoryItem]
    total: int

StartResponse.model_rebuild()
