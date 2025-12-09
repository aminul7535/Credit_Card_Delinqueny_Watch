import React, { useMemo } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Small plugin to draw values on top of each bar (no external datalabels lib)
const drawBarValuePlugin = {
  id: "drawBarValue",
  afterDatasetsDraw: (chart) => {
    // Only run this plugin for Bar charts -> avoid drawing on Pie / Doughnut
    if (!chart || chart.config.type !== 'bar') return;

    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      // If meta.data is missing or not bar elements, skip
      if (!meta || !meta.data) return;
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value === undefined || value === null) return;
        const x = bar.x;
        const y = bar.y;
        ctx.save();
        ctx.font = '12px "Inter", system-ui, -apple-system, "Segoe UI", Roboto';
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        const offset = -6;
        ctx.fillText(`${Number(value).toFixed(1)}%`, x, y + offset);
        ctx.restore();
      });
    });
  }
};
Chart.register(drawBarValuePlugin);

export default function RiskCharts({ records = [] }) {
  // Count occurrences of each risk class
  const counts = useMemo(() => {
    const c = { Low: 0, Medium: 0, High: 0 };
    records.forEach((r) => {
      const key = r.risk_class || r.riskClass || r.risk || "Low";
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [records]);

  const pieData = {
    labels: ["Low", "Medium", "High"],
    datasets: [
      {
        data: [counts.Low, counts.Medium, counts.High],
    "Avg Payment Ratio": "#1E90FF", // bright blue
        backgroundColor: ["#0fb6f3ff", "#F59E0B", "#EF4444"],
        hoverOffset: 6,
      },
    ],
  };



  const pieOptions = {
  responsive: true,
  maintainAspectRatio: false, // important so the canvas fills the wrapper
  plugins: {
    legend: {
      position: "top",
      align: "center",
      labels: { boxWidth: 12, padding: 12 },
    },
    tooltip: { enabled: true },
    // <-- add this to explicitly disable center data labels
    datalabels: {
      display: false
    }
  },
};



  // Compute averages of important columns (now includes Min Due Paid Frequency)
  const avgFeatures = useMemo(() => {
    if (!records.length)
      return {
        "Utilisation %": 0,
        "Avg Payment Ratio": 0,
        "Cash Withdrawal %": 0,
        "Recent Spend Change %": 0,
        "Min Due Paid Frequency": 0,
      };

    const sums = {
      "Utilisation %": 0,
      "Avg Payment Ratio": 0,
      "Cash Withdrawal %": 0,
      "Recent Spend Change %": 0,
      "Min Due Paid Frequency": 0,
    };

    records.forEach((r) => {
      // util, cash, minpaid are expected as percentages in the table (0..100)
      sums["Utilisation %"] += parseFloat(r["Utilisation %"] || r.util_pct || 0);
      // avg payment ratio may be stored as 0..1 or 0..100
      let apr = parseFloat(r["Avg Payment Ratio"] ?? r.avg_pay ?? 0);
      if (apr <= 1.01) apr = apr * 100.0; // convert 0..1 -> percent
      sums["Avg Payment Ratio"] += apr;
      sums["Cash Withdrawal %"] += parseFloat(r["Cash Withdrawal %"] || r.cash_pct || 0);
      // Use absolute spend change magnitude for chart (so + and - don't cancel)
      sums["Recent Spend Change %"] += Math.abs(parseFloat(r["Recent Spend Change %"] || r.spend_change_pct || 0));
      sums["Min Due Paid Frequency"] += parseFloat(r["Min Due Paid Frequency"] || r.minpaid_pct || 0);
    });

    const n = records.length;

    return {
      "Utilisation %": sums["Utilisation %"] / n,
      "Avg Payment Ratio": sums["Avg Payment Ratio"] / n,
      "Cash Withdrawal %": sums["Cash Withdrawal %"] / n,
      "Recent Spend Change %": sums["Recent Spend Change %"] / n,
      "Min Due Paid Frequency": sums["Min Due Paid Frequency"] / n,
    };
  }, [records]);

  // Order and palette
  const labels = [
    "Utilisation %",
    "Avg Payment Ratio",
    "Cash Withdrawal %",
    "Recent Spend Change %",
    "Min Due Paid Frequency",
  ];

  // color for each bar
  const colorMap = {
    "Utilisation %": "#2563EB", // deep blue
    "Avg Payment Ratio": "#1E90FF", // bright blue
    "Cash Withdrawal %": "#F59E0B", // amber / orange
    "Recent Spend Change %": "#9B5DE5", // purple
    "Min Due Paid Frequency": "#10B981", // green
  };

  const barDataset = {
    labels,
    datasets: [
      {
        label: "Average",
        data: labels.map((k) => Number(avgFeatures[k] ?? 0)),
        backgroundColor: labels.map((k) => colorMap[k] || "#3B82F6"),
        borderRadius: 6,
        barThickness: 42,
      },
    ],
  };



 const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    y: {
      beginAtZero: true,
      min: 0,
      max: 100,
      ticks: { stepSize: 20 },
      title: { display: true, text: "%" }
    },
    x: {
      ticks: {
        autoSkip: false,
        maxRotation: 20,
        minRotation: 20,
        // font: { size: 11 } // optional: adjust font size if labels still collide
      }
    }
  }
};

  
  return (
    <div className="space-y-4">
      {/* Pie Chart card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="font-semibold mb-2">Risk Distribution</h4>

        <div style={{ height: 200 }} className="chart-wrap flex items-center justify-center">
          <div style={{ width: "100%", height: "100%", maxWidth: 320, maxHeight: 200 }}>
            <Pie data={pieData} options={pieOptions} />
          </div>
        </div>
      </div>

      {/* Bar Chart card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="font-semibold mb-2">Feature Averages</h4>

        <div style={{ height: 260 }} className="chart-wrap flex items-center justify-center">
          <div style={{ width: "100%", height: "100%" }}>
            <Bar data={barDataset} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
