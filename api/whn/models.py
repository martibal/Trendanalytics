# api/whn/models.py
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal, Optional, List

Severity = Literal["low", "medium", "high"]
SignalKind = Literal[
    "tx_count_spike",
    "failed_tx_spike",
    "fee_spike",
    "gas_util_shift",
    "active_addr_spike",
    "block_time_shift",
    "value_transfer_spike",
    "unknown"
]

class WHNSignal(BaseModel):
    kind: SignalKind
    severity: Severity
    title: str
    explanation: str
    metric: Optional[str] = None
    date: Optional[str] = None
    z_score: Optional[float] = None

class WHNResponse(BaseModel):
    chain: str
    as_of: str = Field(..., description="Last date used for inference (ISO yyyy-mm-dd)")
    lookback_days: int
    signals: List[WHNSignal]
    summary: str
