# Dehua AI KRX history backfill

This folder contains a secret-free, reproducible version of the KRX daily-history cache used by the Lightsail gateway.

## Server installation

Copy the three Python files beside the existing `main.py` and `krx_client.py`, then add this to `main.py`:

```python
from krx_history_routes import router as krx_history_router

app.include_router(krx_history_router)
```

The existing `/etc/dehua-toss-gateway.env` remains the only place for `KRX_AUTH_KEY`. Never commit that file.

## Backfill one year

Run this from `/home/ubuntu/dehua-toss-gateway` with the existing virtual environment:

```bash
sudo -u ubuntu bash -lc 'set -a; source /etc/dehua-toss-gateway.env; set +a; cd /home/ubuntu/dehua-toss-gateway; .venv/bin/python backfill_krx.py --symbol 005930'
```

The script skips weekends and already cached dates. Exchange holidays return no candle and are safely skipped. A small pause avoids sending a burst of requests to KRX.

## Read cached ranges

```text
GET /api/history/005930/range?range=1m
GET /api/history/005930/range?range=1y
GET /api/history/005930/range?start=20250101&end=20251231
```

Browser requests read SQLite only, so they remain fast and do not consume a KRX request for every visitor.
