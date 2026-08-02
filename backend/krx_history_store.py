from __future__ import annotations

import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable


DEFAULT_DB_PATH = Path(__file__).resolve().parent / "krx_cache.db"


def open_database(db_path: str | Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    connection = sqlite3.connect(str(db_path))
    connection.row_factory = sqlite3.Row
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_candles (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            open_price INTEGER NOT NULL,
            high_price INTEGER NOT NULL,
            low_price INTEGER NOT NULL,
            close_price INTEGER NOT NULL,
            volume INTEGER NOT NULL,
            PRIMARY KEY (symbol, date)
        )
        """
    )
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_daily_candles_symbol_date "
        "ON daily_candles(symbol, date)"
    )
    connection.commit()
    return connection


def save_candle(candle: dict, db_path: str | Path = DEFAULT_DB_PATH) -> None:
    with open_database(db_path) as connection:
        connection.execute(
            """
            INSERT INTO daily_candles (
                symbol, date, open_price, high_price, low_price,
                close_price, volume
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol, date) DO UPDATE SET
                open_price = excluded.open_price,
                high_price = excluded.high_price,
                low_price = excluded.low_price,
                close_price = excluded.close_price,
                volume = excluded.volume
            """,
            (
                candle["symbol"],
                candle["date"],
                candle["openPrice"],
                candle["highPrice"],
                candle["lowPrice"],
                candle["closePrice"],
                candle["volume"],
            ),
        )
        connection.commit()


def load_candles(
    symbol: str,
    start: str,
    end: str,
    db_path: str | Path = DEFAULT_DB_PATH,
) -> list[dict]:
    with open_database(db_path) as connection:
        rows = connection.execute(
            """
            SELECT symbol, date, open_price, high_price, low_price,
                   close_price, volume
            FROM daily_candles
            WHERE symbol = ? AND date BETWEEN ? AND ?
            ORDER BY date ASC
            """,
            (symbol, start, end),
        ).fetchall()

    return [
        {
            "symbol": row["symbol"],
            "date": row["date"],
            "openPrice": row["open_price"],
            "highPrice": row["high_price"],
            "lowPrice": row["low_price"],
            "closePrice": row["close_price"],
            "volume": row["volume"],
            "currency": "KRW",
            "source": "KRX",
        }
        for row in rows
    ]


def missing_weekdays(
    symbol: str,
    start: str,
    end: str,
    db_path: str | Path = DEFAULT_DB_PATH,
) -> Iterable[str]:
    start_date = datetime.strptime(start, "%Y%m%d").date()
    end_date = datetime.strptime(end, "%Y%m%d").date()
    if start_date > end_date:
        raise ValueError("start must not be after end")

    with open_database(db_path) as connection:
        cached = {
            row[0]
            for row in connection.execute(
                "SELECT date FROM daily_candles "
                "WHERE symbol = ? AND date BETWEEN ? AND ?",
                (symbol, start, end),
            )
        }

    current: date = start_date
    while current <= end_date:
        formatted = current.strftime("%Y%m%d")
        if current.weekday() < 5 and formatted not in cached:
            yield formatted
        current += timedelta(days=1)
