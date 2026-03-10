from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.security import check_credentials, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginData(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(data: LoginData):
    if not check_credentials(data.username, data.password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    token = create_token(data.username)
    return {"access_token": token, "token_type": "bearer"}
