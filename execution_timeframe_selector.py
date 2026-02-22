import pandas as pd
import numpy as np
from typing import Dict, List, Optional

class ExecutionTimeframeSelector:
    """
    Dynamic Execution Timeframe Selector (ETS) for ICT 2022 Model.
    Scans 1m-5m timeframes to select the highest quality entry setup.
    """
    def __init__(self, weights: Optional[Dict] = None):
        self.weights = weights or {
            'displacement': 0.30,
            'fvg_efficiency': 0.20,
            'rr_score': 0.25,
            'volatility_adj': 0.10,
            'structure_clarity': 0.15
        }
        self.min_quality_score = 0.60

    def select_best_setup(self, mtf_data: Dict[int, pd.DataFrame], htf_bias: str, htf_sweep_extreme: float) -> Optional[Dict]:
        """
        Scans 1m, 2m, 3m, 4m, 5m and returns the best valid setup.
        """
        valid_setups = []
        
        for tf, df in mtf_data.items():
            setup = self._validate_tf_structure(df, htf_bias, htf_sweep_extreme)
            if setup:
                setup['tf'] = tf
                setup['score'] = self._calculate_quality_score(setup, df)
                valid_setups.append(setup)
        
        if not valid_setups:
            return None

        # Phase 3: Multi-Timeframe FVG Confluence
        self._apply_confluence_bonus(valid_setups)

        # Phase 4: Decision Logic
        best_setup = max(valid_setups, key=lambda x: x['score'])
        
        if best_setup['score'] >= self.min_quality_score:
            return best_setup
        
        return None

    def _validate_tf_structure(self, df: pd.DataFrame, bias: str, sweep_extreme: float) -> Optional[Dict]:
        """
        Validates ICT 2022 structure on a specific timeframe.
        """
        if len(df) < 10: return None
        
        # 1. Internal Liquidity Sweep (Simplified)
        # 2. MSS (Close-based)
        # 3. Displacement
        # 4. FVG
        
        # For simulation/logic structure:
        last_price = df['close'].iloc[-1]
        is_buy = bias == 'DISCOUNT'
        
        # Mocking structural validation for the selector logic
        # In production, this would use the deterministic rule engine logic per TF
        if is_buy:
            mss_detected = last_price > df['high'].iloc[-5:-1].max()
            fvg_present = True # Placeholder
        else:
            mss_detected = last_price < df['low'].iloc[-5:-1].min()
            fvg_present = True
            
        if mss_detected and fvg_present:
            return {
                'type': 'BUY' if is_buy else 'SELL',
                'entry': last_price,
                'sl': sweep_extreme,
                'tp': last_price * (1.02 if is_buy else 0.98),
                'fvg_top': last_price * 1.001,
                'fvg_bottom': last_price * 0.999,
                'displacement_mag': abs(last_price - df['close'].iloc[-5]) / (last_price * 0.001)
            }
        return None

    def _calculate_quality_score(self, setup: Dict, df: pd.DataFrame) -> float:
        """
        Phase 2: Quality Scoring System.
        """
        # 1. Displacement Strength
        disp_score = np.clip(setup['displacement_mag'] / 2.0, 0, 1)
        
        # 2. FVG Efficiency (Size relative to displacement)
        fvg_size = abs(setup['fvg_top'] - setup['fvg_bottom'])
        fvg_eff = 1.0 - np.clip(fvg_size / (setup['displacement_mag'] * 10), 0, 1)
        
        # 3. RR Score
        risk = abs(setup['entry'] - setup['sl'])
        reward = abs(setup['tp'] - setup['entry'])
        rr = reward / risk if risk > 0 else 0
        rr_score = np.clip(rr / 3.0, 0, 1)
        
        # 4. Volatility Adjustment
        # Penalize 1m in low vol, boost 3m-5m in compression
        vol = df['close'].pct_change().std() * 100
        vol_adj = 0.5
        if setup['tf'] == 1 and vol < 0.05: vol_adj = 0.2
        if setup['tf'] >= 3 and vol < 0.05: vol_adj = 0.8
        
        # 5. Structure Clarity (Simulated)
        clarity = 0.8
        
        score = (
            self.weights['displacement'] * disp_score +
            self.weights['fvg_efficiency'] * fvg_eff +
            self.weights['rr_score'] * rr_score +
            self.weights['volatility_adj'] * vol_adj +
            self.weights['structure_clarity'] * clarity
        )
        
        return float(score)

    def _apply_confluence_bonus(self, setups: List[Dict]):
        """
        Phase 3: Multi-Timeframe FVG Confluence (Nested FVGs).
        """
        for i, s1 in enumerate(setups):
            confluence_bonus = 0
            for j, s2 in enumerate(setups):
                if i == j: continue
                # Check if s1 FVG is inside s2 FVG (Nested)
                if s1['fvg_bottom'] >= s2['fvg_bottom'] and s1['fvg_top'] <= s2['fvg_top']:
                    confluence_bonus += 0.15
            
            s1['confluence_score'] = confluence_bonus
            s1['score'] = min(s1['score'] + confluence_bonus, 1.0)
