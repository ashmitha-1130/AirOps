from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def ist_now() -> datetime:
    return datetime.now(IST)
