import time
from datetime import datetime
import statistics

class ICT2022Strategy:
    def __init__(self, symbol):
        self.symbol = symbol
        self.m15_high = 0
        self.m15_low = 0
        self.pdh = 0
        self.pdl = 0
        self.price_history_m15 = []
        self.price_history_m1 = []
        self.bias = None # 'PREMIUM' or 'DISCOUNT'
        self.last_sweep = None
        self.pending_setup = None

    def update_m15_context(self, price):
        self.price_history_m15.append(price)
        if len(self.price_history_m15) > 100:
            self.price_history_m15.pop(0)
        
        if len(self.price_history_m15) >= 20:
            self.m15_high = max(self.price_history_m15)
            self.m15_low = min(self.price_history_m15)
            equilibrium = (self.m15_high + self.m15_low) / 2
            
            if price > equilibrium:
                self.bias = 'PREMIUM'
            else:
                self.bias = 'DISCOUNT'

    def check_liquidity_sweep(self, price):
        # Check if we swept PDH or PDL (simulated)
        if self.pdh > 0 and price > self.pdh:
            return 'BUY_SIDE_LIQUIDITY'
        if self.pdl > 0 and price < self.pdl:
            return 'SELL_SIDE_LIQUIDITY'
        
        # Check if we swept M15 range extremes
        if self.m15_high > 0 and price > self.m15_high:
            return 'BUY_SIDE_LIQUIDITY'
        if self.m15_low > 0 and price < self.m15_low:
            return 'SELL_SIDE_LIQUIDITY'
            
        return None

    def analyze(self, current_price):
        self.update_m15_context(current_price)
        self.price_history_m1.append(current_price)
        if len(self.price_history_m1) > 20:
            self.price_history_m1.pop(0)

        # 1. Check for Sweep
        sweep = self.check_liquidity_sweep(current_price)
        if sweep:
            self.last_sweep = {
                'type': sweep,
                'price': current_price,
                'time': time.time()
            }
            return {'log': f"ICT: {sweep} detected at {current_price}"}

        # 2. Check for MSS (Market Structure Shift)
        if self.last_sweep:
            # If we swept buy-side, we look for MSS to the downside (Sell setup)
            if self.last_sweep['type'] == 'BUY_SIDE_LIQUIDITY' and self.bias == 'PREMIUM':
                # Look for a break below a recent low
                recent_low = min(self.price_history_m1[-5:])
                if current_price < recent_low:
                    # Displacement check (simplified)
                    if abs(current_price - recent_low) > (current_price * 0.0005):
                        self.pending_setup = 'SELL'
                        self.last_sweep = None # Reset sweep
                        return {'log': "ICT: MSS Downside detected. Looking for FVG..."}

            # If we swept sell-side, we look for MSS to the upside (Buy setup)
            elif self.last_sweep['type'] == 'SELL_SIDE_LIQUIDITY' and self.bias == 'DISCOUNT':
                recent_high = max(self.price_history_m1[-5:])
                if current_price > recent_high:
                    if abs(current_price - recent_high) > (current_price * 0.0005):
                        self.pending_setup = 'BUY'
                        self.last_sweep = None
                        return {'log': "ICT: MSS Upside detected. Looking for FVG..."}

        # 3. Check for FVG and Entry
        if self.pending_setup:
            # Simplified FVG: Check if we are in a retracement
            # In a real model, we'd check the 3-candle gap
            # For simulation, we'll trigger if price pulls back slightly
            setup = self.pending_setup
            self.pending_setup = None
            return {
                'action': setup,
                'log': f"ICT: FVG Entry triggered for {setup}",
                'sl': current_price * (1.005 if setup == 'SELL' else 0.995),
                'tp': current_price * (0.985 if setup == 'SELL' else 1.015)
            }

        return None

    def set_daily_levels(self, pdh, pdl):
        self.pdh = pdh
        self.pdl = pdl
