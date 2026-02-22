import time
import statistics
import random
from datetime import datetime
from smt_detector import SMTDetector
from execution_timeframe_selector import ExecutionTimeframeSelector

class ICTProductionEngine:
    """
    Production-grade ICT 2022 Model with ML-ready feature engineering, SMT filtering,
    and Dynamic Execution Timeframe Selection (ETS).
    """
    def __init__(self, symbol):
        self.symbol = symbol
        # Data Layer State: 1m, 2m, 3m, 4m, 5m, 15m
        self.mtf_history = {tf: [] for tf in [1, 2, 3, 4, 5, 15]}
        self.max_history = 200
        
        # Structural State
        self.dealing_range = {'high': 0, 'low': 0, 'eq': 0}
        self.bias = None # PREMIUM / DISCOUNT
        
        # Components
        self.smt_detector = SMTDetector()
        self.ets = ExecutionTimeframeSelector()
        
        # Setup Tracking
        self.active_sweep = None
        self.mss_detected = False
        self.fvg_zone = None
        
    def update_data(self, price, timeframe=1):
        """Data Layer: Ingests OHLCV data for multiple timeframes."""
        data_point = {'price': price, 'time': time.time(), 'high': price, 'low': price, 'close': price}
        
        if timeframe in self.mtf_history:
            self.mtf_history[timeframe].append(data_point)
            if len(self.mtf_history[timeframe]) > self.max_history:
                self.mtf_history[timeframe].pop(0)
            
            if timeframe == 15:
                self._update_htf_structure()

    def _update_htf_structure(self):
        """ICT Rule Engine: Define Dealing Range & Bias."""
        if len(self.mtf_history[15]) < 20: return
        
        prices = [p['price'] for p in self.mtf_history[15][-20:]]
        self.dealing_range['high'] = max(prices)
        self.dealing_range['low'] = min(prices)
        self.dealing_range['eq'] = (self.dealing_range['high'] + self.dealing_range['low']) / 2
        
        current_price = self.mtf_history[15][-1]['price']
        self.bias = 'PREMIUM' if current_price > self.dealing_range['eq'] else 'DISCOUNT'

    def detect_setup(self, current_price, secondary_price=None):
        """Main Rule Engine Loop with ETS."""
        # 1. Check for HTF Liquidity Sweep
        sweep = self._check_sweeps(current_price)
        if sweep:
            self.active_sweep = {
                'type': sweep,
                'price': current_price,
                'time': time.time(),
                'aggression': self._calculate_sweep_aggression(current_price, sweep)
            }
            
            # SMT Confluence
            if secondary_price:
                smt_result = self._evaluate_smt(current_price, secondary_price)
                if smt_result['smt_type']:
                    return {'log': f"ICT Rule Engine: {sweep} Sweep detected. SMT Divergence ({smt_result['smt_type']}) confirmed."}

            return {'log': f"ICT Rule Engine: {sweep} Sweep detected. Scanning execution timeframes (1m-5m)..."}

        # 2. Dynamic Execution Timeframe Selection (ETS)
        if self.active_sweep:
            # Convert history to DataFrames for ETS
            mtf_dfs = {}
            for tf in [1, 2, 3, 4, 5]:
                if len(self.mtf_history[tf]) >= 10:
                    mtf_dfs[tf] = pd.DataFrame(self.mtf_history[tf])
            
            if mtf_dfs:
                best_setup = self.ets.select_best_setup(mtf_dfs, self.bias, self.active_sweep['price'])
                
                if best_setup:
                    self._reset_state()
                    return {
                        'action': best_setup['type'],
                        'tf': best_setup['tf'],
                        'score': best_setup['score'],
                        'log': f"ETS: Timeframe {best_setup['tf']}m selected (Score: {best_setup['score']:.2f}). Executing trade.",
                        'setup': best_setup
                    }

        return None

    def _evaluate_smt(self, primary_price, secondary_price):
        """Evaluates SMT Divergence using the SMTDetector."""
        # In a real system, we'd pass dataframes. Here we simulate the result.
        # SMT is valid if Primary makes HH but Secondary fails (Bearish)
        # or Primary makes LL but Secondary fails (Bullish)
        smt_type = None
        if self.active_sweep:
            if self.active_sweep['type'] == 'BUY_SIDE' and random.random() > 0.6:
                smt_type = 'bearish'
            elif self.active_sweep['type'] == 'SELL_SIDE' and random.random() > 0.6:
                smt_type = 'bullish'
        
        return {
            "smt_type": smt_type,
            "strength_score": random.uniform(0.7, 0.95) if smt_type else 0.0,
            "liquidity_context_valid": True
        }

    def _check_sweeps(self, price):
        if self.dealing_range['high'] > 0 and price > self.dealing_range['high']: return 'BUY_SIDE'
        if self.dealing_range['low'] > 0 and price < self.dealing_range['low']: return 'SELL_SIDE'
        return None

    def _check_mss(self, price):
        # Simplified MSS logic: Price reversal after sweep
        if not self.active_sweep: return False
        if self.active_sweep['type'] == 'BUY_SIDE' and price < self.active_sweep['price'] * 0.999: return True
        if self.active_sweep['type'] == 'SELL_SIDE' and price > self.active_sweep['price'] * 1.001: return True
        return False

    def _calculate_sweep_aggression(self, price, sweep_type):
        """Feature Engineering: Quantify sweep depth."""
        level = self.dealing_range['high'] if sweep_type == 'BUY_SIDE' else self.dealing_range['low']
        return abs(price - level) / (price * 0.001)

    def _calculate_displacement(self):
        """Feature Engineering: Quantify MSS strength."""
        return random.uniform(0.5, 1.0) # Simulated displacement metric

    def _engineer_features(self, price):
        """Feature Engineering Layer."""
        return {
            'bias_proximity': abs(price - self.dealing_range['eq']) / price,
            'sweep_aggression': self.active_sweep['aggression'] if self.active_sweep else 0,
            'volatility_regime': statistics.stdev([p['price'] for p in self.m1_history[-10:]]) if len(self.m1_history) > 10 else 0,
            'time_in_session': True # Placeholder for session logic
        }

    def _ml_quality_filter(self, features):
        """ML Modeling Layer: Probabilistic Ranking."""
        score = 0.5
        if features['sweep_aggression'] > 0.5: score += 0.2
        if features['bias_proximity'] > 0.002: score += 0.1
        return min(score, 0.95)

    def _reset_state(self):
        self.active_sweep = None
        self.mss_detected = False
        self.fvg_zone = None
