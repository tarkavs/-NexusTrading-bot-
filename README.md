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

## 🛡️ Risk Management
- **Max Risk per Trade**: 1.0% (Dynamic scaling based on ML confidence)
- **Killzone Restriction**: Only executes during London and New York sessions.
- **News Filter**: Automated flattening before high-impact red folder events.

---

*Disclaimer: Trading involves significant risk. This software is for educational and research purposes only.*
