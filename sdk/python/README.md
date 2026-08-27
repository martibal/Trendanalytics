# Urd Atlas Python client

Official lightweight reference client for the Urd Atlas HTTP/JSON API.

This package intentionally uses only the Python standard library so it is easy to inspect and vendor. The HTTP/OpenAPI contract remains the canonical integration surface.

## Install from the repository

```bash
pip install ./sdk/python
```

## Public endpoints

```python
from urdatlas import UrdAtlas

ua = UrdAtlas()
print(ua.status())
print(ua.summary("ethereum"))
```

## Subscriber artifacts

```python
from urdatlas import UrdAtlas

ua = UrdAtlas(api_key="ta_live_...")
meta_90d = ua.bundle("meta", "ethereum", "90d")
manifest = ua.manifest("meta", "ethereum")
one_day = ua.day("meta", "ethereum", "2026-08-26")
```

The client raises `UrdAtlasError` for HTTP and network failures. Respect `429` responses and `Retry-After` as documented at `/api-docs/rate-limits`.
