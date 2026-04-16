import pyotp


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp(secret: str, otp_code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(otp_code, valid_window=1)
