from sqlmodel import SQLModel, Field
from datetime import datetime,timezone,timedelta
from typing import Optional


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    telegram_id: int = Field(unique=True, index=True, nullable=False)
    username: Optional[str] = Field(default=None)
    full_name: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc)+timedelta(hours=3))


class LoginSession(SQLModel, table=True):
    __tablename__ = "login_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_token: str = Field(unique=True, index=True, max_length=64)
    telegram_id: Optional[int] = Field(default=None, index=True)
    code: Optional[str] = Field(default=None, max_length=6)
    status: str = Field(default="pending", max_length=20)  # pending, code_sent, verified, expired
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc)+timedelta(hours=3))
  
    expires_at: datetime = Field(nullable=False)


class ChatRoom(SQLModel, table=True):
    __tablename__ = "chat_rooms"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)
    created_by: int = Field(foreign_key="users.telegram_id", nullable=False)
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=3))


class RoomMember(SQLModel, table=True):
    __tablename__ = "room_members"

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: int = Field(foreign_key="chat_rooms.id", nullable=False)
    user_id: int = Field(foreign_key="users.telegram_id", nullable=False)
    joined_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=3))

class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: int = Field(foreign_key="chat_rooms.id", nullable=False)
    user_id: int = Field(foreign_key="users.telegram_id", nullable=False)
    text: str = Field(max_length=5000)
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=3))
