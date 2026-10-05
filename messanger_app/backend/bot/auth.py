from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from api.database import settings, get_session
from api.models import User, AuthCode

security = HTTPBearer()

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def verify_code(telegram_id: int, code: str, session: AsyncSession) -> User:
    # Ищем код через SQLModel select
    statement = (
        select(AuthCode)
        .where(
            AuthCode.telegram_id == telegram_id,
            AuthCode.code == code,
            AuthCode.used == False,
            AuthCode.expires_at > datetime.utcnow()
        )
        .order_by(AuthCode.created_at.desc())
        .limit(1)
    )
    result = await session.execute(statement)
    auth_code = result.scalar_one_or_none()

    if not auth_code:
        raise HTTPException(status_code=400, detail="Неверный или просроченный код")

  
    auth_code.used = True
    session.add(auth_code)
    await session.commit()

   
    statement = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Сначала запусти /start в боте")

    return user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        telegram_id: int = payload.get("sub")
        if telegram_id is None:
            raise HTTPException(status_code=401, detail="Неверный токен")
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")

    statement = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user