import requests
import sqlite3
import time
import json
import os
import logging
from ict_strategy import ICT2022Strategy

# Ensure logs directory exists
if not os.path.exists('logs'):
    os.makedirs('logs')

# Configure logging
logging.basicConfig(
    filename='logs/bot.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Load configuration
with open('config.json', 'r') as f:
    CONFIG = json.load(f)

def init_db():
    conn = sqlite3.connect('trades.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS trades
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  symbol TEXT,
                  type TEXT,
                  price REAL,
                  amount REAL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                  strategy TEXT)''')
    conn.commit()
    conn.close()

def log_trade(symbol, side, price, amount, strategy):
    conn = sqlite3.connect('trades.db')
    c = conn.cursor()
    c.execute("INSERT INTO trades (symbol, type, price, amount, strategy) VALUES (?,?,?,?,?)",
              (symbol, side, price, amount, strategy))
    conn.commit()
    conn.close()
    msg = f"Logged {side} trade for {symbol} at ${price} using {strategy}"
    print(f"INFO: {msg}")
    logging.info(msg)

def run_bot():
    print("NexusTrade ICT Bot started...")
    logging.info("Bot started.")
    init_db()
    
    # Initialize strategies for each symbol
    strategies = {
        'GBP/USD': ICT2022Strategy('GBP/USD'),
        'XAU/USD': ICT2022Strategy('XAU/USD'),
        'EUR/USD': ICT2022Strategy('EUR/USD')
    }
    
    # Set some mock daily levels
    strategies['XAU/USD'].set_daily_levels(2055.0, 2035.0)
    
    while True:
        try:
            import random
            for symbol, strategy in strategies.items():
                # Mock price simulation
                base_price = 1.2650 if 'GBP' in symbol else 2045.50 if 'XAU' in symbol else 1.0820
                price = base_price + (random.random() - 0.5) * (base_price * 0.01)
                
                result = strategy.analyze(price)
                
                if result:
                    if 'log' in result:
                        print(f"STRATEGY: {result['log']}")
                        logging.info(result['log'])
                    
                    if 'action' in result:
                        amount = 10 if 'XAU' in symbol else 10000
                        log_trade(symbol, result['action'], price, amount, "ICT 2022 Model")
            
            time.sleep(CONFIG.get('interval', 5))
        except Exception as e:
            error_msg = f"Unexpected error: {e}. Retrying in 30 seconds..."
            print(f"ERROR: {error_msg}")
            logging.error(error_msg)
            time.sleep(30)

if __name__ == "__main__":
    run_bot()
