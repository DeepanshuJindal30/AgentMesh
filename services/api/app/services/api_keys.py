"""Secure API key hashing helpers."""

from __future__ import annotations

import hashlib
import hmac
import secrets


def generate_api_key() -> tuple[str, str, str]:
    """
    Returns (plaintext, prefix, sha256_hex).
    Plaintext is shown once at creation; only hash is stored.
    """
    raw = secrets.token_urlsafe(32)
    plaintext = f"am_{raw}"
    prefix = plaintext[:12]
    key_hash = hash_api_key(plaintext)
    return plaintext, prefix, key_hash


def hash_api_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def verify_api_key(plaintext: str, key_hash: str) -> bool:
    return hmac.compare_digest(hash_api_key(plaintext), key_hash)
