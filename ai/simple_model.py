"""
Simple example model: synthetic dataset and a small classifier/regressor to score assets.
This is a prototype: production requires feature engineering, backtests, model governance, and explainability (SHAP).
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

def generate_synthetic(n=1000):
    # features: liquidity, turnover, avg_hold_days, rental_yield, cap_rate, local_index_change
    X = pd.DataFrame({
        "liquidity": np.random.exponential(1.0, n),
        "turnover": np.random.exponential(0.5, n),
        "avg_hold_days": np.random.normal(180, 60, n).clip(1, 3650),
        "rental_yield": np.random.normal(0.05, 0.02, n).clip(0.0, 0.2),
        "cap_rate": np.random.normal(0.06, 0.015, n).clip(0.01, 0.2),
        "local_index_change": np.random.normal(0.0, 0.05, n)
    })
    # synthetic target: expected 12-month price change %
    y = 0.5 * X["local_index_change"] + 0.2 * X["rental_yield"] - 0.1 * X["cap_rate"] + 0.05 * np.log1p(X["liquidity"]) + np.random.normal(0, 0.02, n)
    return X, y

if __name__ == "__main__":
    X, y = generate_synthetic(2000)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    print("RMSE:", mean_squared_error(y_test, preds, squared=False))