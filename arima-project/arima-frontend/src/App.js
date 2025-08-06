import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Registracija Chart.js komponenti
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [data, setData] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [params, setParams] = useState({ p: 2, d: 1, q: 2 });
  const [numSteps, setNumSteps] = useState(7);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    rmse: null,
    mae: null,
    mape: null,
    aic: null,
    bic: null,
  });

  const handleFileUpload = (e) => {
    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data.map((row) => ({
          Datum: row.Datum,
          Potrošnja: Number(row.Potrošnja),
        }));
        setData(parsedData);
        setForecast([]);
        setMetrics({
          rmse: null,
          mae: null,
          mape: null,
          aic: null,
          bic: null,
        });
      },
    });
  };

  const runForecast = async () => {
    if (data.length === 0) {
      alert("Molimo učitajte podatke prije predviđanja.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/predict?p=${params.p}&d=${params.d}&q=${params.q}&steps=${numSteps}`,
        data
      );
      setForecast(response.data.forecast);
      setMetrics({
        rmse: response.data.rmse,
        mae: response.data.mae,
        mape: response.data.mape,
        aic: response.data.aic,
        bic: response.data.bic,
      });
    } catch (err) {
      alert("Došlo je do greške pri predviđanju.");
      console.error(err);
      setMetrics({
        rmse: null,
        mae: null,
        mape: null,
        aic: null,
        bic: null,
      });
    }
    setLoading(false);
  };

  const getChartData = () => {
    const labels = data
      .map((d) => d.Datum)
      .concat(Array.from({ length: forecast.length }, (_, i) => `Pred.${i + 1}`));
    const values = data.map((d) => d.Potrošnja).concat(forecast);

    return {
      labels,
      datasets: [
        {
          label: "Potrošnja",
          data: values,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 255, 0.3)",
          fill: false,
          tension: 0.1,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "category",
        title: {
          display: true,
          text: "Datum",
        },
      },
      y: {
        type: "linear",
        title: {
          display: true,
          text: "Potrošnja",
        },
      },
    },
    plugins: {
      legend: {
        display: true,
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
  };

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h2>Predviđanje potrošnje (ARIMA)</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      <div style={{ marginTop: 20 }}>
        <label>
          p:
          <input
            type="number"
            min="0"
            value={params.p}
            onChange={(e) => setParams({ ...params, p: +e.target.value })}
            style={{ width: 50, marginLeft: 5, marginRight: 15 }}
          />
        </label>
        <label>
          d:
          <input
            type="number"
            min="0"
            value={params.d}
            onChange={(e) => setParams({ ...params, d: +e.target.value })}
            style={{ width: 50, marginLeft: 5, marginRight: 15 }}
          />
        </label>
        <label>
          q:
          <input
            type="number"
            min="0"
            value={params.q}
            onChange={(e) => setParams({ ...params, q: +e.target.value })}
            style={{ width: 50, marginLeft: 5, marginRight: 15 }}
          />
        </label>
        <label>
          Broj dana za predviđanje:
          <input
            type="number"
            min="1"
            value={numSteps}
            onChange={(e) => setNumSteps(+e.target.value)}
            style={{ width: 70, marginLeft: 5, marginRight: 15 }}
          />
        </label>
        <button onClick={runForecast} disabled={loading}>
          {loading ? "Predviđanje..." : "Izračunaj"}
        </button>
      </div>

      <div style={{ position: "relative", height: 400, marginTop: 40 }}>
        {data.length > 0 && (
          <Line
            key={data.length + forecast.length}
            data={getChartData()}
            options={options}
          />
        )}
      </div>

      {metrics.aic !== null && (
        <div style={{ padding: 20, background: "#f0f2f7", marginTop: 20, borderRadius: 8 }}>
          <h4>Sažetak izvedbe modela:</h4>
          {metrics.rmse !== null ? (
            <>
              <div>RMSE (Root Mean Square Error): <b>{metrics.rmse.toFixed(2)}</b></div>
              <div>MAE (Mean Absolute Error): <b>{metrics.mae.toFixed(2)}</b></div>
              <div>MAPE (Mean Absolute Percentage Error): <b>{metrics.mape.toFixed(2)}%</b></div>
            </>
          ) : (
            <div>Rezultati pogreške nisu dostupni (nedovoljno podataka za validaciju)</div>
          )}
          <div>AIC (Akaike Information Criterion): <b>{metrics.aic.toFixed(2)}</b></div>
          <div>BIC (Bayesian Information Criterion): <b>{metrics.bic.toFixed(2)}</b></div>
        </div>
      )}
    </div>
  );
}

export default App;
