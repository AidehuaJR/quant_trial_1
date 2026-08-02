from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query

from krx_history_store import load_candles


router = APIRouter()
SYMBOL_PATTERN = re.compile(r"^[0-9A-Z]{1,12}$")
RANGE_DAYS = {"1m": 35, "3m": 100, "1y": 370, "all": 3650}


def valid_date(value: str) -> str:
    try:
        datetime.strptime(value, "%Y%m%d")
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Date must use YYYYMMDD") from error
    return value


@router.get("/api/history/{symbol}/range")
async def history_range(
    symbol: str,
    range_name: str = Query(default="1m", alias="range"),
    start: str | None = None,
    end: str | None = None,
):
    symbol = symbol.strip().upper()
    if not SYMBOL_PATTERN.fullmatch(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol")

    end_value = valid_date(end) if end else date.today().strftime("%Y%m%d")
    if start:
        start_value = valid_date(start)
    else:
        days = RANGE_DAYS.get(range_name)
        if days is None:
            raise HTTPException(status_code=400, detail="range must be 1m, 3m, 1y, or all")
        end_date = datetime.strptime(end_value, "%Y%m%d").date()
        start_value = (end_date - timedelta(days=days)).strftime("%Y%m%d")

    if start_value > end_value:
        raise HTTPException(status_code=400, detail="start must not be after end")

    candles = load_candles(symbol, start_value, end_value)
    return {
        "symbol": symbol,
        "interval": "1d",
        "source": "KRX_CACHE",
        "start": start_value,
        "end": end_value,
        "count": len(candles),
        "result": candles,
    }
