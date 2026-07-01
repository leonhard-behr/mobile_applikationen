# game router:
# /api/game/* endpoints
#
# all endpoints require jwt authentication

from uuid import UUID
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.repositories.game import GameRepository
from app.schemas.game import (
    GuessRequest,
    GuessResponse,
    StartResponse,
    HintRequest,
    HintResponse,
    LettersResponse,
    VictoryRequest,
    VictoryResponse,
    NewGameResponse,
    GameHistoryResponse,
)
from app.services.game import GameService

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/start", response_model=StartResponse)
async def game_start(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # starts or resumes current days daily game
    svc = GameService(db)
    data = await svc.start_daily(user.id)
    return data


@router.post("/guess", response_model=GuessResponse)
async def game_guess(req: GuessRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), game_id: Optional[str] = Query(None), attempts: int = Query(0)):
    # submits a guess word
    # print(f"DEBUG: game_guess called with word: {req.word}")
    session_id = UUID(game_id) if game_id else None
    svc = GameService(db)
    data = await svc.submit_guess(
        user_id=user.id,
        word=req.word,
        session_id=session_id,
        attempts=attempts,
    )
    return data


@router.post("/hint", response_model=HintResponse)
async def game_hint(req: HintRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), game_id: Optional[str] = Query(None)):
    # requests an adaptive hint
    session_id = UUID(game_id) if game_id else None
    svc = GameService(db)
    data = await svc.request_hint(
        user_id=user.id,
        hint_number=req.hint_number,
        current_best_rank=req.current_best_rank,
        session_id=session_id,
    )
    return data


@router.get("/letters", response_model=LettersResponse)
async def game_letters(attempts: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), game_id: Optional[str] = Query(None)):
    # returns revealed letters based on attempt count
    session_id = UUID(game_id) if game_id else None
    svc = GameService(db)
    data = await svc.get_letters(
        user_id=user.id,
        attempts=attempts,
        session_id=session_id,
    )
    return data


@router.post("/victory", response_model=VictoryResponse)
async def game_victory(req: VictoryRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # returns pca 2d coordinates for the victory map
    svc = GameService(db)
    data = await svc.get_victory_coordinates(req.words)
    return data


@router.get("/victory/{day}", response_model=VictoryResponse)
async def game_victory_by_day(day: date, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # returns pca 2d coordinates for a past completed daily game
    # print(f"DEBUG: fetching victory coordinates for user={user.id} day={day}")
    repo = GameRepository(db)
    session = await repo.get_daily_session(user.id, day)
    if not session or not session.won:
        raise HTTPException(status_code=404, detail="game session not found or not completed")
    
    guesses = await repo.get_guesses(session.id)
    words = [g.word for g in guesses]
    
    svc = GameService(db)
    data = await svc.get_victory_coordinates(words)
    return data


@router.post("/new", response_model=NewGameResponse)
async def game_new(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # starts a new freeplay game (freeplay is disabled in the frontend)
    svc = GameService(db)
    data = await svc.start_new_game(user.id)
    return data


@router.get("/history", response_model=GameHistoryResponse)
async def game_history(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    # returns the limited game history for the authenticated user
    svc = GameService(db)
    data = await svc.get_history(user.id, limit, offset)
    return data

