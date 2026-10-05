from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    telegram_id: int = Field(unique=True, index=True, nullable=False)
    username: Optional[str] = Field(default=None)
    full_name: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

class AuthCode(SQLModel, table=True):
    __tablename__ = "auth_codes"

    id: Optional[int] = Field(default=None, primary_key=True)
    telegram_id: int = Field(index=True, nullable=False)
    code: str = Field(max_length=6, nullable=False)
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc)+timedelta(hours=3))
    expires_at: datetime = Field(nullable=False)
    used: bool = Field(default=False)