import pandas as pd
import numpy as np
from typing import Dict, Optional, List

class SMTDetector:
    """
    Production-grade SMT (Smart Money Technique) Divergence Detector.
    Compares primary instrument (US100) with secondary (SPX500) using fractal pivots.
    """
    def __init__(self, pivot_window: int = 5, tolerance: int = 3):
        self.pivot_window = pivot_window
        self.tolerance = tolerance
        self.primary_swings = {'highs': [], 'lows': []}
        self.secondary_swings = {'highs': [], 'lows': []}

    def detect_fractal_pivots(self, df: pd.DataFrame) -> Dict[str, List[Dict]]:
        """
        Identifies fractal pivots (swing highs/lows).
        A high is a pivot if it's the highest in the window [i-w, i+w].
        """
        highs = []
        lows = []
        
        for i in range(self.pivot_window, len(df) - self.pivot_window):
            # Swing High
            if df['high'].iloc[i] == df['high'].iloc[i-self.pivot_window : i+self.pivot_window+1].max():
                highs.append({
                    'price': df['high'].iloc[i],
                    'index': i,
                    'time': df.index[i]
                })
            
            # Swing Low
            if df['low'].iloc[i] == df['low'].iloc[i-self.pivot_window : i+self.pivot_window+1].min():
                lows.append({
                    'price': df['low'].iloc[i],
                    'index': i,
                    'time': df.index[i]
                })
                
        return {'highs': highs, 'lows': lows}

    def analyze_divergence(self, primary_df: pd.DataFrame, secondary_df: pd.DataFrame, liquidity_context: Dict) -> Dict:
        """
        Vectorized-style analysis of SMT divergence between two dataframes.
        """
        p_pivots = self.detect_fractal_pivots(primary_df)
        s_pivots = self.detect_fractal_pivots(secondary_df)
        
        if not p_pivots['highs'] or not s_pivots['highs']:
            return self._empty_result()

        # Get most recent confirmed pivots
        p_h2, p_h1 = p_pivots['highs'][-2:] if len(p_pivots['highs']) >= 2 else (None, None)
        s_h2, s_h1 = s_pivots['highs'][-2:] if len(s_pivots['highs']) >= 2 else (None, None)
        
        p_l2, p_l1 = p_pivots['lows'][-2:] if len(p_pivots['lows']) >= 2 else (None, None)
        s_l2, s_l1 = s_pivots['lows'][-2:] if len(s_pivots['lows']) >= 2 else (None, None)

        # 1. Bearish SMT (Primary HH, Secondary LH/Equal)
        if p_h1 and p_h2 and s_h1 and s_h2:
            if p_h1['price'] > p_h2['price'] and s_h1['price'] <= s_h2['price']:
                # Time alignment check
                if abs((p_h1['index'] - s_h1['index'])) <= self.tolerance:
                    return self._build_result("bearish", p_h1, s_h1, primary_df, liquidity_context)

        # 2. Bullish SMT (Primary LL, Secondary HL/Equal)
        if p_l1 and p_l2 and s_l1 and s_l2:
            if p_l1['price'] < p_l2['price'] and s_l1['price'] >= s_l2['price']:
                if abs((p_l1['index'] - s_l1['index'])) <= self.tolerance:
                    return self._build_result("bullish", p_l1, s_l1, primary_df, liquidity_context)

        return self._empty_result()

    def _build_result(self, smt_type: str, p_pivot: Dict, s_pivot: Dict, df: pd.DataFrame, context: Dict) -> Dict:
        atr = self._calculate_atr(df)
        strength = abs(p_pivot['price'] - s_pivot['price']) / atr if atr > 0 else 0
        
        # Liquidity Context Check
        valid_context = self._check_liquidity_proximity(p_pivot['price'], context)
        
        return {
            "smt_type": smt_type,
            "strength_score": float(np.clip(strength, 0, 1)),
            "swing_reference_primary": p_pivot['price'],
            "swing_reference_secondary": s_pivot['price'],
            "time_alignment_score": 1.0 - (abs(p_pivot['index'] - s_pivot['index']) / self.tolerance),
            "liquidity_context_valid": valid_context
        }

    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        high_low = df['high'] - df['low']
        high_cp = np.abs(df['high'] - df['close'].shift())
        low_cp = np.abs(df['low'] - df['close'].shift())
        tr = pd.concat([high_low, high_cp, low_cp], axis=1).max(axis=1)
        return tr.rolling(period).mean().iloc[-1]

    def _check_liquidity_proximity(self, price: float, context: Dict) -> bool:
        threshold = price * 0.0005 # 0.05% proximity
        for level in context.get('levels', []):
            if abs(price - level) < threshold:
                return True
        return False

    def _empty_result(self) -> Dict:
        return {
            "smt_type": None,
            "strength_score": 0.0,
            "swing_reference_primary": 0.0,
            "swing_reference_secondary": 0.0,
            "time_alignment_score": 0.0,
            "liquidity_context_valid": False
        }
