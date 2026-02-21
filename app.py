from flask import Flask, render_template, jsonify, request, send_from_directory
import sqlite3
import os
import threading
import time
import logging

# Mock MetaTrader5 for non-Windows environments
try:
    import MetaTrader5 as mt5
    HAS_MT5 = True
except ImportError:
    HAS_MT5 = False
    class MockMT5:
        def initialize(self, **kwargs): return True
        def login(self, **kwargs): return True
        def account_info(self):
            class Info:
                login = 12345
                balance = 10000.0
                equity = 10000.0
                currency = "USD"
                server = "MockServer"
            return Info()
        def last_error(self): return (0, "No error (Mock Mode)")
        def shutdown(self): pass
    mt5 = MockMT5()

app = Flask(__name__, static_folder='static', template_folder='templates')

# Global state for MT5
class MT5Manager:
    def __init__(self):
        self.connected = False
        self.account_info = None
        self.logs = []
        self.lock = threading.Lock()
        self.credentials = {}
        self.stop_thread = False

    def add_log(self, message):
        timestamp = time.strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] {message}")
        if len(self.logs) > 100:
            self.logs.pop(0)

    def poll_status(self):
        while not self.stop_thread:
            if self.connected:
                with self.lock:
                    info = mt5.account_info()
                    if info:
                        self.account_info = {
                            "login": info.login,
                            "balance": info.balance,
                            "equity": info.equity,
                            "currency": info.currency,
                            "server": info.server
                        }
                    else:
                        self.add_log(f"Connection lost. Error: {mt5.last_error()}")
                        self.connected = False
                        # Auto-reconnect logic
                        self.attempt_login()
            time.sleep(5)

    def attempt_login(self):
        if not self.credentials:
            return False
        
        self.add_log(f"Attempting to connect to {self.credentials['server']}...")
        
        if not mt5.initialize():
            err = mt5.last_error()
            self.add_log(f"Initialize failed: {err}")
            return False

        authorized = mt5.login(
            login=int(self.credentials['login']),
            password=self.credentials['password'],
            server=self.credentials['server']
        )

        if authorized:
            self.connected = True
            self.add_log("Successfully connected to MetaTrader 5")
            return True
        else:
            err = mt5.last_error()
            self.add_log(f"Login failed: {err}")
            return False

mt5_manager = MT5Manager()
threading.Thread(target=mt5_manager.poll_status, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    with mt5_manager.lock:
        mt5_manager.credentials = {
            "login": data.get('login'),
            "password": data.get('isInvestor') and data.get('investorPassword') or data.get('mainPassword'),
            "server": data.get('server')
        }
        success = mt5_manager.attempt_login()
    
    if success:
        return jsonify({"status": "success", "message": "Logged in successfully"})
    else:
        err = mt5.last_error()
        return jsonify({"status": "error", "message": f"Error {err[0]}: {err[1]}"}), 401

@app.route('/api/status')
def status():
    return jsonify({
        "connected": mt5_manager.connected,
        "account": mt5_manager.account_info,
        "logs": mt5_manager.logs
    })

if __name__ == '__main__':
    if not HAS_MT5:
        print("WARNING: MetaTrader5 library not found or not on Windows. Running in MOCK MODE.")
    app.run(debug=True, port=3000, host='0.0.0.0')
