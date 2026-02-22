# 🚀 NexusTrade: Advanced ICT 2022 Algorithmic Trading Suite

![Trading Dashboard](https://images.unsplash.com/photo-1611974714024-462cd297c8aa?auto=format&fit=crop&q=80&w=1200&h=400)

NexusTrade is a production-grade algorithmic trading platform built for professional traders. It implements the **ICT 2022 Mentorship Model** with a hybrid deterministic-probabilistic execution engine, enhanced by Machine Learning quality filters and Intermarket Analysis (SMT).

---

## 💎 Core Features

### 🧠 ICT 2022 Deterministic Engine
A strict rule-based engine that identifies high-probability structural setups:
- **15M Dealing Range & Bias**: Automated premium/discount array identification.
- **Liquidity Mapping**: Real-time tracking of PDH/PDL and session extremes.
- **Market Structure Shift (MSS)**: Close-based confirmation with displacement scoring.
- **Fair Value Gap (FVG)**: Precision entry detection within displacement legs.

### ⚡ Dynamic Execution Timeframe Selector (ETS)
Instead of forcing 1m entries, the system scans **1m, 2m, 3m, 4m, and 5m** timeframes simultaneously to select the entry with the highest **Quality Score**.

### 📊 Smart Money Technique (SMT)
Intermarket divergence detection between **US100 (Nasdaq)** and **US500 (S&P 500)** to confirm institutional sponsorship at key liquidity sweeps.

### 🤖 ML-Enhanced Quality Filter
Tree-based models (simulated) rank setups based on:
- Displacement Velocity
- FVG Efficiency
- Risk-to-Reward Potential
- Volatility Regime

---

## 🛠️ Tech Stack

- **Backend**: Node.js (Express) + TypeScript
- **Frontend**: React 19 + Tailwind CSS + Framer Motion
- **Database**: SQLite3 (Production-ready local storage)
- **Bot Core**: Python 3.11+
- **Real-time**: Socket.io for live price and log streaming

---

## 📈 Traded Assets

The system is optimized for high-liquidity instruments:
- **Indices**: US100 (Nasdaq)
- **Forex**: GBP/USD, EUR/USD
- **Commodities**: XAU/USD (Gold)

---

## 🚀 Getting Started

### 1. Web Dashboard (Real-time Monitoring)
```bash
npm install
npm run dev
```
Access the dashboard at `http://localhost:3000`.

### 2. Python Bot (Execution Engine)
```bash
# Ensure you have Python installed
pip install -r requirements.txt
python bot.py
```

---

![Chart Analysis](https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1200&h=300)

### 🛡️ Adaptive Risk Allocation (0.1% – 0.8%)
The system dynamically scales risk for every trade based on ML confidence and historical performance:
- **Low Confidence**: 0.1% allocation
- **Medium Confidence**: 0.4% allocation
- **High Confidence**: 0.8% allocation
- **Hard Limit**: 0.8% per trade maximum.

### 🔄 Continuous Learning Layer
NexusTrade doesn't just trade; it evolves.
- **Outcome Tracking**: Every trade is logged with its full structural context.
- **Reinforcement Learning**: Successful setups increase the priority of similar future conditions.
- **Adaptive Weights**: The scoring engine dynamically adjusts feature weights (displacement, FVG efficiency, etc.) based on recent win rates.

### 🕒 Institutional Killzones & News
- **Session Filters**: Only executes during high-volatility London and New York sessions.
- **News Protection**: Automated flattening before high-impact "Red Folder" news events to avoid slippage and unpredictable volatility.

---

*Disclaimer: Trading involves significant risk. This software is for educational and research purposes only.*
