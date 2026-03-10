import io
import json
import os
from typing import Optional

import pyotp
import segno

DATA_DIR = os.environ.get("DATA_DIR", "/data")
MFA_FILE = f"{DATA_DIR}/mfa.json"
ISSUER = "Cave à Vin"


def _read() -> dict:
    if not os.path.exists(MFA_FILE):
        return {"enabled": False, "secret": None}
    with open(MFA_FILE) as f:
        return json.load(f)


def _write(state: dict) -> None:
    with open(MFA_FILE, "w") as f:
        json.dump(state, f)


def is_enabled() -> bool:
    return _read().get("enabled", False)


def get_secret() -> Optional[str]:
    return _read().get("secret")


def generate_setup(username: str) -> dict:
    """Generate a fresh secret + QR code. Does NOT save yet — user must confirm."""
    secret = pyotp.random_base32()
    uri = pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=ISSUER)
    qr = segno.make_qr(uri, error="h")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=6, dark="#5c1010", light="#fdf2f2")
    qr_data_uri = "data:image/png;base64," + __import__("base64").b64encode(buf.getvalue()).decode()
    return {"secret": secret, "qr_code": qr_data_uri, "uri": uri}


def verify_code(code: str, secret: Optional[str] = None) -> bool:
    if secret is None:
        secret = get_secret()
    if not secret:
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def enable(secret: str, code: str) -> bool:
    """Verify code against the candidate secret, then persist."""
    if not verify_code(code, secret):
        return False
    _write({"enabled": True, "secret": secret})
    return True


def disable(code: str) -> bool:
    """Verify code against the stored secret, then clear."""
    if not verify_code(code):
        return False
    _write({"enabled": False, "secret": None})
    return True
