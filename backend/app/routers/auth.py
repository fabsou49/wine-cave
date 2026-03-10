from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import mfa as mfa_service
from app.core.security import (
    check_credentials,
    create_temp_token,
    create_token,
    decode_temp_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginData(BaseModel):
    username: str
    password: str


class MfaVerifyData(BaseModel):
    temp_token: str
    code: str


class MfaCodeData(BaseModel):
    code: str


class MfaEnableData(BaseModel):
    secret: str
    code: str


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(data: LoginData):
    if not check_credentials(data.username, data.password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    if mfa_service.is_enabled():
        temp_token = create_temp_token(data.username)
        return {"mfa_required": True, "temp_token": temp_token}

    return {"access_token": create_token(data.username), "token_type": "bearer"}


@router.post("/mfa/verify")
async def mfa_verify(data: MfaVerifyData):
    username = decode_temp_token(data.temp_token)
    if not username:
        raise HTTPException(status_code=401, detail="Session expirée, reconnectez-vous")

    if not mfa_service.verify_code(data.code):
        raise HTTPException(status_code=401, detail="Code incorrect")

    return {"access_token": create_token(username), "token_type": "bearer"}


# ── MFA management (requires full auth) ──────────────────────────────────────

@router.get("/mfa/status")
async def mfa_status(username: str = Depends(get_current_user)):
    return {"enabled": mfa_service.is_enabled()}


@router.get("/mfa/setup")
async def mfa_setup(username: str = Depends(get_current_user)):
    """Generate a new candidate secret + QR code. Does NOT activate MFA yet."""
    return mfa_service.generate_setup(username)


@router.post("/mfa/enable")
async def mfa_enable(data: MfaEnableData, username: str = Depends(get_current_user)):
    if not mfa_service.enable(data.secret, data.code):
        raise HTTPException(status_code=400, detail="Code incorrect — scannez à nouveau le QR")
    return {"ok": True}


@router.post("/mfa/disable")
async def mfa_disable(data: MfaCodeData, username: str = Depends(get_current_user)):
    if not mfa_service.disable(data.code):
        raise HTTPException(status_code=400, detail="Code incorrect")
    return {"ok": True}
