from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import numpy as np

app = Flask(__name__)
CORS(app)

def mean_absolute_error(y_true, y_pred):
    return np.mean(np.abs(y_true - y_pred))

def mean_absolute_percentage_error(y_true, y_pred):
    # Izbjegava dijeljenje s 0
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    df = pd.DataFrame(data)
    df['Potrošnja'] = pd.to_numeric(df['Potrošnja'], errors='coerce')
    ts = df['Potrošnja'].dropna()

    p = int(request.args.get('p', 2))
    d = int(request.args.get('d', 1))
    q = int(request.args.get('q', 2))
    steps = int(request.args.get('steps', 7))

    model = ARIMA(ts, order=(p, d, q))
    model_fit = model.fit()

    forecast_res = model_fit.get_forecast(steps=steps)
    forecast = forecast_res.predicted_mean.tolist()

    rmse, mae, mape = None, None, None
    if len(ts) > steps:
        y_true = ts[-steps:]
        model_pred = model_fit.predict(start=len(ts)-steps, end=len(ts)-1)
        rmse = np.sqrt(np.mean((y_true - model_pred) ** 2))
        mae = mean_absolute_error(y_true, model_pred)
        mape = mean_absolute_percentage_error(y_true, model_pred)

    aic = model_fit.aic
    bic = model_fit.bic

    return jsonify({
        "forecast": forecast,
        "rmse": rmse,
        "mae": mae,
        "mape": mape,
        "aic": aic,
        "bic": bic
    })

if __name__ == '__main__':
    app.run(debug=True)