import requests
import sqlite3
import time
import json
import os
import logging
from ict_strategy import ICTProductionEngine

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
    print("NexusTrade Production ICT Bot started...")
    logging.info("Bot started.")
    init_db()
    
    # Initialize strategies for each symbol
    strategies = {
        'GBP/USD': ICTProductionEngine('GBP/USD'),
        'XAU/USD': ICTProductionEngine('XAU/USD'),
        'EUR/USD': ICTProductionEngine('EUR/USD'),
        'US100': ICTProductionEngine('US100')
    }
    
    while True:
        try:
            import random
            for symbol, strategy in strategies.items():
                # Mock price simulation
                if 'GBP' in symbol: base_price = 1.2650
                elif 'XAU' in symbol: base_price = 2045.50
                elif 'EUR' in symbol: base_price = 1.0820
                elif 'US100' in symbol: base_price = 18250.00
                else: base_price = 100.00
                
                price = base_price + (random.random() - 0.5) * (base_price * 0.005)
                
                # Simulate secondary instrument for SMT (e.g., US500 if primary is US100)
                secondary_price = price * 0.25 + (random.random() - 0.5) * 10 
                
                # Update data layer for multiple timeframes
                strategy.update_data(price, 1) # 1m always updated
                
                # Simulate other timeframes (2m, 3m, 4m, 5m, 15m)
                if random.random() > 0.5: strategy.update_data(price, 2)
                if random.random() > 0.6: strategy.update_data(price, 3)
                if random.random() > 0.7: strategy.update_data(price, 4)
                if random.random() > 0.8: strategy.update_data(price, 5)
                if random.random() > 0.9: strategy.update_data(price, 15)
                
                # SMT is an added confluence, especially for US100
                result = strategy.detect_setup(price, secondary_price=secondary_price)
                
                if result:
                    if 'log' in result:
                        prefix = f"[{symbol}] "
                        print(f"STRATEGY: {prefix}{result['log']}")
                        logging.info(f"{prefix}{result['log']}")
                    
                    if 'action' in result:
                        amount = 10 if 'XAU' in symbol else 1 if 'US100' in symbol else 10000
                        log_trade(symbol, result['action'], price, amount, "ICT 2022 Model")
            
            time.sleep(CONFIG.get('interval', 5))
        except Exception as e:
            error_msg = f"Unexpected error: {e}. Retrying in 30 seconds..."
            print(f"ERROR: {error_msg}")
            logging.error(error_msg)
            time.sleep(30)

if __name__ == "__main__":
    run_bot()
