import MetaTrader5 as mt5
import json
import sys

def connect_mt5():
    # Load configuration
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
            mt5_config = config.get('mt5', {})
    except FileNotFoundError:
        print("Error: config.json not found.")
        return
    except json.JSONDecodeError:
        print("Error: Failed to decode config.json.")
        return

    login = mt5_config.get('login')
    password = mt5_config.get('password')
    server = mt5_config.get('server')
    path = mt5_config.get('path')

    # Initialize connection to the MetaTrader 5 terminal
    # If path is provided, it will try to launch the terminal from that path
    if not mt5.initialize(path=path, login=login, password=password, server=server):
        error_code = mt5.last_error()
        print(f"Failed to initialize MT5. Error code: {error_code}")
        
        # Specific error handling based on common codes
        if error_code[0] == mt5.RES_E_INVALID_PARAMS:
            print("Reason: Invalid parameters (check your login/password/server).")
        elif error_code[0] == mt5.RES_E_CONNECTION_FAILED:
            print("Reason: Connection failed (check your internet or server name).")
        elif error_code[0] == mt5.RES_E_NOT_FOUND:
            print("Reason: Terminal not found at the specified path.")
        else:
            print(f"Reason: {error_code[1]}")
        
        mt5.shutdown()
        return

    print("Successfully connected to MetaTrader 5")

    # Get account info
    account_info = mt5.account_info()
    if account_info is None:
        print(f"Failed to get account info. Error code: {mt5.last_error()}")
        mt5.shutdown()
        return

    # Print account details
    print("-" * 30)
    print(f"Account: {account_info.login}")
    print(f"Server:  {account_info.server}")
    print(f"Balance: {account_info.balance} {account_info.currency}")
    print(f"Equity:  {account_info.equity} {account_info.currency}")
    print("-" * 30)

    # Shut down the connection
    mt5.shutdown()

if __name__ == "__main__":
    # Note: MetaTrader5 library only works on Windows
    if sys.platform != 'win32':
        print("Warning: The MetaTrader5 library is only supported on Windows.")
        print("This script is provided for local use on your Windows PC.")
    
    connect_mt5()
