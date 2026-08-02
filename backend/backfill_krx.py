from __future__ import annotations

import argparse
import asyncio
from datetime import date, timedelta

from krx_client import fetch_symbol_daily_candle
from krx_history_store import DEFAULT_DB_PATH, load_candles, missing_weekdays, save_candle


async def backfill(symbol: str, start: str, end: str, pause: float) -> dict:
    requested = saved = no_data = failed = 0

    for trading_date in missing_weekdays(symbol, start, end):
        requested += 1
        try:
            candle = await fetch_symbol_daily_candle(symbol, trading_date)
            if candle is None:
                no_data += 1
            else:
                save_candle(candle)
                saved += 1
        except Exception as error:  # continue so one bad day does not lose the run
            failed += 1
            print(f"WARN date={trading_date} error={type(error).__name__}: {error}")

        if pause:
            await asyncio.sleep(pause)

    total = len(load_candles(symbol, start, end))
    return {
        "symbol": symbol,
        "start": start,
        "end": end,
        "requested": requested,
        "saved": saved,
        "noData": no_data,
        "failed": failed,
        "cachedTotal": total,
        "database": str(DEFAULT_DB_PATH),
    }


def parse_args() -> argparse.Namespace:
    today = date.today()
    parser = argparse.ArgumentParser(description="Backfill KRX daily candles into SQLite")
    parser.add_argument("--symbol", required=True, help="Six-digit KRX symbol")
    parser.add_argument("--start", default=(today - timedelta(days=370)).strftime("%Y%m%d"))
    parser.add_argument("--end", default=today.strftime("%Y%m%d"))
    parser.add_argument("--pause", type=float, default=0.15, help="Delay between KRX requests")
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    result = asyncio.run(
        backfill(
            arguments.symbol.strip().upper(),
            arguments.start,
            arguments.end,
            max(arguments.pause, 0),
        )
    )
    print(result)
