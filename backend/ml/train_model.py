import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import root_mean_squared_error

# Create directory if it doesn't exist
os.makedirs(os.path.join(os.path.dirname(__file__), "saved_models"), exist_ok=True)

def generate_synthetic_training_data(n_samples: int = 1000):
    """
    Generate synthetic historical data to train the model when real historical API data is unavailable.
    """
    np.random.seed(42)
    
    # Generate random input features
    aqi_t = np.random.uniform(30.0, 350.0, n_samples)
    aqi_lag1 = aqi_t * 0.95 + np.random.normal(0, 10, n_samples)
    aqi_lag3 = aqi_t * 0.90 + np.random.normal(0, 15, n_samples)
    aqi_lag6 = aqi_t * 0.85 + np.random.normal(0, 20, n_samples)
    aqi_lag12 = aqi_t * 0.80 + np.random.normal(0, 25, n_samples)
    aqi_lag24 = aqi_t + np.random.normal(0, 30, n_samples)  # high correlation with same time yesterday
    
    temperature = np.random.uniform(15.0, 42.0, n_samples)
    humidity = np.random.uniform(20.0, 95.0, n_samples)
    wind_speed = np.random.uniform(2.0, 25.0, n_samples)
    wind_direction = np.random.uniform(0.0, 360.0, n_samples)
    precipitation = np.random.uniform(0.0, 10.0, n_samples)
    
    hour_of_day = np.random.randint(0, 24, n_samples)
    day_of_week = np.random.randint(0, 7, n_samples)
    month = np.random.randint(1, 13, n_samples)
    is_weekend = (day_of_week >= 5).astype(int)
    
    aqi_rolling_mean_6h = (aqi_t + aqi_lag1 + aqi_lag3) / 3.0
    aqi_rolling_std_6h = np.random.uniform(5.0, 25.0, n_samples)
    aqi_rolling_mean_24h = (aqi_t + aqi_lag24) / 2.0
    aqi_rolling_max_24h = np.maximum(aqi_t, aqi_lag24) + np.random.uniform(0, 15, n_samples)
    
    X = pd.DataFrame({
        "aqi_t": aqi_t,
        "aqi_t-1": aqi_lag1,
        "aqi_t-3": aqi_lag3,
        "aqi_t-6": aqi_lag6,
        "aqi_t-12": aqi_lag12,
        "aqi_t-24": aqi_lag24,
        "temperature": temperature,
        "humidity": humidity,
        "wind_speed": wind_speed,
        "wind_direction": wind_direction,
        "precipitation": precipitation,
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "month": month,
        "is_weekend": is_weekend,
        "aqi_rolling_mean_6h": aqi_rolling_mean_6h,
        "aqi_rolling_std_6h": aqi_rolling_std_6h,
        "aqi_rolling_mean_24h": aqi_rolling_mean_24h,
        "aqi_rolling_max_24h": aqi_rolling_max_24h,
    })
    
    # Target: AQI in 24 hours (for demonstration training)
    # Target depends on current AQI, diurnal cycle, and weather (high temp/humidity + low wind = high AQI)
    y = (
        X["aqi_t"] * 0.7 
        + X["aqi_t-24"] * 0.2 
        + (X["humidity"] * 0.3) 
        - (X["wind_speed"] * 2.5) 
        + np.sin(X["hour_of_day"] / 24.0 * 2.0 * np.pi) * 20.0
        + np.random.normal(0, 15, n_samples)
    )
    
    # Clip AQI to realistic boundaries [0, 500]
    y = np.clip(y, 0, 500)
    
    return X, y

def train_and_save_model():
    """
    Train an XGBoost model and save it to joblib.
    """
    print("Generating synthetic dataset for training...")
    X, y = generate_synthetic_training_data(2000)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training XGBoost Regressor...")
    model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    rmse = root_mean_squared_error(y_test, preds)
    print(f"Model trained successfully. Test RMSE: {rmse:.4f}")
    
    model_path = os.path.join(os.path.dirname(__file__), "saved_models", "xgboost_aqi_model.joblib")
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")
    
    # Save a metadata file too
    metadata = {
        "rmse": float(rmse),
        "features": list(X.columns),
        "model_version": "xgboost_v1",
        "trained_at": pd.Timestamp.now().isoformat()
    }
    metadata_path = os.path.join(os.path.dirname(__file__), "saved_models", "model_metadata.joblib")
    joblib.dump(metadata, metadata_path)
    
    return rmse

if __name__ == "__main__":
    train_and_save_model()
