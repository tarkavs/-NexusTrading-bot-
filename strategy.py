import statistics

# State for advanced strategy
price_history = []
MAX_HISTORY = 50

def simple_strategy(current_price, volume=100):
    """
    Refined strategy incorporating volatility, trends, and support/resistance.
    """
    global price_history
    price_history.append(current_price)
    if len(price_history) > MAX_HISTORY:
        price_history.pop(0)

    # Need at least some history to make informed decisions
    if len(price_history) < 20:
        return None

    # 1. Trend Analysis (Moving Average)
    ma_short = sum(price_history[-5:]) / 5
    ma_long = sum(price_history[-20:]) / 20
    trend_up = ma_short > ma_long

    # 2. Volatility (Standard Deviation)
    volatility = statistics.stdev(price_history[-20:])
    
    # 3. Dynamic Support/Resistance (Min/Max of recent history)
    support = min(price_history[-20:])
    resistance = max(price_history[-20:])
    
    # 4. Decision Logic
    # Buy if:
    # - Price is near support
    # - Trend is turning up
    # - Volatility is relatively low (avoiding extreme spikes)
    # - Volume is healthy (simulated)
    
    if current_price <= support * 1.001 and trend_up and volume > 50:
        return 'BUY'
    
    # Sell if:
    # - Price is near resistance
    # - Trend is turning down
    # - Volatility is high (potential reversal)
    
    elif current_price >= resistance * 0.999 and not trend_up:
        return 'SELL'
    
    return None
