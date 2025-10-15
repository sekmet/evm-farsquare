"""
Example pipeline step: read events from DB (populated by Envio/HyperIndex), build features per asset.
This skeleton shows how to pull events and create a simple time-windowed feature set for the ML models.
"""
import pandas as pd
import sqlalchemy
from datetime import datetime, timedelta

engine = sqlalchemy.create_engine("postgresql://user:pass@localhost:5432/yourdb")

def build_token_features(token_address, window_days=30):
    q = f"""
    SELECT block_time, amount_in::numeric/1e18 as amount_in
    FROM order_filled_events
    WHERE token_in = '{token_address}' AND block_time > now() - interval '{window_days} days'
    """
    df = pd.read_sql(q, engine)
    if df.empty:
        return pd.DataFrame()
    df['day'] = pd.to_datetime(df['block_time']).dt.date
    daily = df.groupby('day').sum().reset_index()
    daily['rolling_7'] = daily['amount_in'].rolling(7, min_periods=1).mean()
    return daily