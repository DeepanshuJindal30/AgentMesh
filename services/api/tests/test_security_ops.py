"""Tests for API key hashing and rate-limit helper shape."""

from app.services.api_keys import generate_api_key, hash_api_key, verify_api_key
from app.services.rate_limit import RateLimitResult


def test_api_key_hash_roundtrip() -> None:
    plaintext, prefix, key_hash = generate_api_key()
    assert plaintext.startswith("am_")
    assert prefix == plaintext[:12]
    assert verify_api_key(plaintext, key_hash)
    assert not verify_api_key(plaintext + "x", key_hash)
    assert hash_api_key(plaintext) == key_hash


def test_rate_limit_result_fields() -> None:
    result = RateLimitResult(allowed=False, retry_after=12, remaining=0)
    assert result.retry_after == 12
    assert not result.allowed
