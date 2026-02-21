import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database("trades.db");

// Initialize Database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT,
      type TEXT,
      price REAL,
      amount REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      strategy TEXT
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/trades", (req, res) => {
    db.all("SELECT * FROM trades ORDER BY timestamp DESC LIMIT 50", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  app.get("/api/logs", (req, res) => {
    db.all("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  app.get("/api/stats", (req, res) => {
    db.get(`
      SELECT 
        COUNT(*) as total_trades,
        COALESCE(SUM(CASE WHEN type = 'BUY' THEN -price * amount ELSE price * amount END), 0) as net_pnl
      FROM trades
    `, (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });

  // MT5 Integration State
  let mt5Status = { connected: false, account: null, logs: [] as string[] };
  const addMt5Log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    mt5Status.logs.push(`[${time}] ${msg}`);
    if (mt5Status.logs.length > 100) mt5Status.logs.shift();
    io.emit("mt5_log", { message: msg, timestamp: new Date().toISOString() });
  };

  app.post("/api/mt5/login", async (req, res) => {
    const { login, password, server } = req.body;
    addMt5Log(`Attempting connection to ${server}...`);
    
    // In a real environment, we would spawn a python process here
    // For this demo, we simulate the MT5 handshake
    setTimeout(() => {
      if (password === "error") {
        addMt5Log("Login failed: Invalid credentials (10003)");
        res.status(401).json({ status: "error", message: "Invalid Account or Password" });
      } else {
        mt5Status.connected = true;
        mt5Status.account = { login, balance: 10500.25, equity: 10500.25, currency: "USD", server } as any;
        addMt5Log("Successfully connected to MetaTrader 5 terminal");
        res.json({ status: "success" });
      }
    }, 1500);
  });

  app.get("/api/mt5/status", (req, res) => {
    res.json(mt5Status);
  });

  // Existing Bot Simulation Logic
  let isBotRunning = false;
  let botInterval: NodeJS.Timeout | null = null;
  const SYMBOLS = ["GBP/USD", "XAU/USD", "EUR/USD"];
  const prices: Record<string, number> = { "GBP/USD": 1.2650, "XAU/USD": 2045.50, "EUR/USD": 1.0820 };

  const logToDb = (level: string, message: string) => {
    db.run("INSERT INTO logs (level, message) VALUES (?, ?)", [level, message], (err) => {
      if (err) console.error("Log Error:", err);
    });
    io.emit("log", { level, message, timestamp: new Date().toISOString() });
  };

  const executeTrade = (symbol: string, type: 'BUY' | 'SELL', price: number, amount: number, strategy: string) => {
    db.run("INSERT INTO trades (symbol, type, price, amount, strategy) VALUES (?, ?, ?, ?, ?)",
      [symbol, type, price, amount, strategy], (err) => {
        if (err) console.error("Trade Error:", err);
      });
    
    const trade = { symbol, type, price, amount, strategy, timestamp: new Date().toISOString() };
    io.emit("trade", trade);
    logToDb("INFO", `Executed ${type} order for ${amount} ${symbol} at $${price.toFixed(2)}`);
  };

  app.post("/api/bot/toggle", (req, res) => {
    isBotRunning = !isBotRunning;
    
    if (isBotRunning) {
      logToDb("SYSTEM", "Bot started. Monitoring multi-asset portfolio...");
      botInterval = setInterval(() => {
        SYMBOLS.forEach(symbol => {
          // Volatility simulation
          const volatility = symbol === "XAU/USD" ? 0.0015 : 0.0008;
          prices[symbol] *= (1 + (Math.random() - 0.5) * volatility);
          
          io.emit("price_update", { symbol, price: prices[symbol] });

          // Strategy simulation
          if (Math.random() > 0.98) {
            const side = Math.random() > 0.5 ? "BUY" : "SELL";
            const amount = symbol === "XAU/USD" ? 10 : 10000;
            const strategies = ["Neural Trend", "ICT 2022 Model", "Liquidity Sweep"];
            const strategy = strategies[Math.floor(Math.random() * strategies.length)];
            
            if (strategy === "ICT 2022 Model") {
              const bias = Math.random() > 0.5 ? "Premium" : "Discount";
              const sweepType = side === "SELL" ? "Buy-side" : "Sell-side";
              
              const ictSteps = [
                `15M Framework: Bias is ${bias}`,
                `15M Framework: ${sweepType} Liquidity Sweep detected`,
                "LTF: Market Structure Shift (MSS) with displacement",
                "LTF: Fair Value Gap (FVG) identified in the displacement leg",
                "Execution: Retracement to FVG entry zone"
              ];
              
              ictSteps.forEach((step, i) => {
                setTimeout(() => logToDb("INFO", `[${symbol}] ${step}`), i * 800);
              });
              
              setTimeout(() => {
                const sl = side === "BUY" ? prices[symbol] * 0.995 : prices[symbol] * 1.005;
                const tp = side === "BUY" ? prices[symbol] * 1.015 : prices[symbol] * 0.985;
                executeTrade(symbol, side, prices[symbol], amount, strategy);
                logToDb("SYSTEM", `[${symbol}] ICT Trade Active. SL: ${sl.toFixed(4)} | TP: ${tp.toFixed(4)}`);
              }, ictSteps.length * 800);
            } else {
              executeTrade(symbol, side, prices[symbol], amount, strategy);
            }
          }
        });

        // Simulate Order Book
        const orderBook = SYMBOLS.map(symbol => ({
          symbol,
          bids: Array.from({ length: 5 }, (_, i) => ({ price: prices[symbol] * (1 - (i + 1) * 0.0001), size: Math.random() * 2 })),
          asks: Array.from({ length: 5 }, (_, i) => ({ price: prices[symbol] * (1 + (i + 1) * 0.0001), size: Math.random() * 2 })),
        }));
        io.emit("order_book", orderBook);

      }, 2000);
    } else {
      if (botInterval) clearInterval(botInterval);
      logToDb("SYSTEM", "Bot stopped.");
    }
    
    res.json({ running: isBotRunning });
  });

  app.get("/api/bot/status", (req, res) => {
    res.json({ running: isBotRunning });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
