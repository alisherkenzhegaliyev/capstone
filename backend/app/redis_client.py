import logging

import redis as redis_lib

from app.settings import REDIS_URL

logger = logging.getLogger(__name__)

_client: redis_lib.Redis | None = None
_tried = False


def get_redis() -> redis_lib.Redis | None:
    global _client, _tried
    if _tried:
        return _client
    _tried = True
    if not REDIS_URL:
        return None
    try:
        client = redis_lib.from_url(REDIS_URL, decode_responses=True)
        client.ping()
        _client = client
        logger.info("Redis connected at %s", REDIS_URL)
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — xray images will not be cached", exc)
    return _client
