"""Custom exception types"""

from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base exception for all application-level errors."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


# ── Auth ──

class InvalidCredentials(AppException):
    def __init__(self, detail: str = "Invalid username or password."):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail)


class TokenExpired(AppException):
    def __init__(self, detail: str = "Token has expired."):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail)


class TokenInvalid(AppException):
    def __init__(self, detail: str = "Token is invalid."):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail)


class UserAlreadyExists(AppException):
    def __init__(self, field: str = "username"):
        super().__init__(status.HTTP_409_CONFLICT, f"A user with that {field} already exists.")


class UserNotFound(AppException):
    def __init__(self):
        super().__init__(status.HTTP_404_NOT_FOUND, "User not found.")


# ── Game ──

class GameSessionNotFound(AppException):
    def __init__(self):
        super().__init__(status.HTTP_404_NOT_FOUND, "Game session not found.")


class GameAlreadyCompleted(AppException):
    def __init__(self):
        super().__init__(status.HTTP_400_BAD_REQUEST, "This game has already been completed.")


class DuplicateGuess(AppException):
    def __init__(self, word: str):
        super().__init__(status.HTTP_409_CONFLICT, f"You already guessed '{word}'.")


class EmptyGuess(AppException):
    def __init__(self):
        super().__init__(status.HTTP_400_BAD_REQUEST, "Word must not be empty.")


class HintLimitReached(AppException):
    def __init__(self, max_hints: int = 3):
        super().__init__(status.HTTP_400_BAD_REQUEST, f"Maximum of {max_hints} hints already used.")


class InvalidWordLength(AppException):
    def __init__(self, message: str = "Invalid word length."):
        super().__init__(status.HTTP_400_BAD_REQUEST, message)

# ── Social ──

class FriendRequestNotFound(AppException):
    def __init__(self):
        super().__init__(status.HTTP_404_NOT_FOUND, "Friend request not found.")


class AlreadyFriends(AppException):
    def __init__(self):
        super().__init__(status.HTTP_409_CONFLICT, "You are already friends with this user.")


class ProfileNotPublic(AppException):
    def __init__(self):
        super().__init__(status.HTTP_403_FORBIDDEN, "This profile is not public.")


class FriendRequestAlreadySent(AppException):
    def __init__(self):
        super().__init__(status.HTTP_409_CONFLICT, "Friend request already sent.")


class SelfFriendshipRequest(AppException):
    def __init__(self):
        super().__init__(status.HTTP_400_BAD_REQUEST, "You cannot send a friend request to yourself.")


class FriendshipBlocked(AppException):
    def __init__(self):
        super().__init__(status.HTTP_403_FORBIDDEN, "Friendship is blocked.")
