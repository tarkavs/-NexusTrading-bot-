# NexusTrade Bot

A professional-grade trading bot project with a React-based web dashboard and a Python-based execution engine.

## Project Structure

- `bot.py`: Main Python bot logic for local execution.
- `strategy.py`: Strategy functions used by the bot.
- `config.json`: Configuration for API keys and bot settings.
- `server.ts`: Express server for the web dashboard.
- `src/`: React frontend source code.
- `trades.db`: SQLite database (shared between Python bot and Web Dashboard).

## Getting Started (Local Python Bot)

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Configure your API keys in `config.json`.
3. Run the bot:
   ```bash
   python bot.py
   ```

## Getting Started (Web Dashboard)

1. Install Node dependencies:
   ```bash
   npm install
   ```
2. Start the dashboard:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` to view your trades and bot status.

## Git Workflow

To push to your repository:

```bash
git init
git add .
git commit -m "Initial commit: Nexustrader Bot"
git remote add origin git@github.com:tarkavs/trading_bot.git
git branch -M main
git push -u origin main
```
