from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


class UrdAtlasError(RuntimeError):
    def __init__(self, status: int | None, code: str | None, message: str):
        super().__init__(message)
        self.status = status
        self.code = code


@dataclass
class UrdAtlas:
    api_key: str | None = None
    base_url: str = "https://www.urdatlas.com"
    timeout: float = 30.0

    def _json(self, path: str, *, authenticated: bool = False) -> Any:
        headers = {"Accept": "application/json", "User-Agent": "urdatlas-python/0.1"}
        if authenticated:
            if not self.api_key:
                raise UrdAtlasError(None, "missing_api_key", "This endpoint requires an API key.")
            headers["X-API-Key"] = self.api_key
        req = Request(self.base_url.rstrip("/") + path, headers=headers, method="GET")
        try:
            with urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(body)
            except Exception:
                payload = {}
            raise UrdAtlasError(exc.code, payload.get("code"), payload.get("message") or body or str(exc)) from exc
        except URLError as exc:
            raise UrdAtlasError(None, "network_error", str(exc)) from exc

    def status(self) -> Any:
        return self._json("/api/v1/status")

    def landing(self) -> Any:
        return self._json("/api/v1/landing")

    def summary(self, chain: str) -> Any:
        return self._json(f"/api/v1/summary/{quote(chain)}")

    def bundle(self, genre: str, chain: str, window: str = "latest") -> Any:
        if window == "latest":
            path = f"/api/v1/files/{quote(genre)}/{quote(chain)}/latest.json"
        else:
            path = f"/api/v1/files/{quote(genre)}/{quote(chain)}/{quote(window)}/latest.json"
        return self._json(path, authenticated=True)

    def manifest(self, genre: str, chain: str) -> Any:
        return self._json(f"/api/v1/files/{quote(genre)}/{quote(chain)}/manifest.json", authenticated=True)

    def day(self, genre: str, chain: str, date: str) -> Any:
        return self._json(f"/api/v1/files/{quote(genre)}/{quote(chain)}/{quote(date)}.json", authenticated=True)
