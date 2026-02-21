import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  Play, Pause, Activity, History, Terminal, Settings, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Shield, Cpu, Database, Code,
  Layers, Zap, BarChart3, Globe, Lock, RefreshCw, ChevronRight, Search
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Trade {
  id?: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  timestamp: string;
  strategy: string;
}

interface Log {
  id?: number;
  level: string;
  message: string;
  timestamp: string;
}

interface PricePoint {
  time: string;
  price: number;
}

interface OrderBookEntry {
  price: number;
  size: number;
}

interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

const COLORS = ['#141414', '#5A5A40', '#8E9299', '#D1D1D1'];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, PricePoint[]>>({
    "GBP/USD": [], "XAU/USD": [], "EUR/USD": []
  });
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [orderBooks, setOrderBooks] = useState<OrderBook[]>([]);
  const [stats, setStats] = useState({ total_trades: 0, net_pnl: 0 });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'logs' | 'code' | 'analytics'>('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState("GBP/USD");
  
  const socketRef = useRef<Socket | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [mt5Status, setMt5Status] = useState<{ connected: boolean, account: any, logs: string[] }>({ connected: false, account: null, logs: [] });
  const [mt5Creds, setMt5Creds] = useState({ login: '', password: '', server: 'MetaQuotes-Demo' });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetch('/api/trades').then(res => res.json()).then(setTrades);
    fetch('/api/logs').then(res => res.json()).then(setLogs);
    fetch('/api/stats').then(res => res.json()).then(setStats);
    fetch('/api/bot/status').then(res => res.json()).then(data => setIsRunning(data.running));
    fetch('/api/mt5/status').then(res => res.json()).then(setMt5Status);

    socketRef.current = io();

    socketRef.current.on('mt5_log', (log: { message: string }) => {
      setMt5Status(prev => ({ ...prev, logs: [...prev.logs, log.message].slice(-50) }));
    });

    socketRef.current.on('price_update', (data: { symbol: string, price: number }) => {
      setCurrentPrices(prev => ({ ...prev, [data.symbol]: data.price }));
      setPriceHistory(prev => {
        const history = prev[data.symbol] || [];
        const newHistory = [...history, { time: new Date().toLocaleTimeString(), price: data.price }];
        return { ...prev, [data.symbol]: newHistory.slice(-40) };
      });
    });

    socketRef.current.on('order_book', (data: OrderBook[]) => {
      setOrderBooks(data);
    });

    socketRef.current.on('trade', (trade: Trade) => {
      setTrades(prev => [trade, ...prev].slice(0, 100));
      fetch('/api/stats').then(res => res.json()).then(setStats);
    });

    socketRef.current.on('log', (log: Log) => {
      setLogs(prev => [log, ...prev].slice(0, 200));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const toggleBot = async () => {
    const res = await fetch('/api/bot/toggle', { method: 'POST' });
    const data = await res.json();
    setIsRunning(data.running);
  };

  const activeOrderBook = orderBooks.find(ob => ob.symbol === selectedSymbol);

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300",
      darkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F4] text-[#141414]"
    )}>
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-[#141414] flex-col items-center py-8 gap-10 z-50">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#141414] shadow-lg">
          <Zap size={24} fill="currentColor" />
        </div>
        
        <nav className="flex flex-col gap-6">
          {[
            { id: 'dashboard', icon: Activity },
            { id: 'analytics', icon: BarChart3 },
            { id: 'trades', icon: History },
            { id: 'logs', icon: Terminal },
            { id: 'code', icon: Code },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all group relative",
                activeTab === item.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              )}
            >
              <item.icon size={20} />
              {activeTab === item.id && (
                <motion.div layoutId="active-pill" className="absolute -left-4 w-1 h-6 bg-white rounded-r-full" />
              )}
              <span className="absolute left-16 bg-[#141414] text-white text-[10px] uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-white/10">
                {item.id}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-6">
          <button className="text-white/40 hover:text-white transition-colors"><Globe size={20} /></button>
          <button className="text-white/40 hover:text-white transition-colors"><Settings size={20} /></button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141414] h-16 flex items-center justify-around px-4 z-50 border-t border-white/10">
        {[
          { id: 'dashboard', icon: Activity },
          { id: 'analytics', icon: BarChart3 },
          { id: 'trades', icon: History },
          { id: 'logs', icon: Terminal },
          { id: 'code', icon: Code },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
              activeTab === item.id ? "bg-white/10 text-white" : "text-white/40"
            )}
          >
            <item.icon size={18} />
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="md:pl-20 min-h-screen pb-20 md:pb-0">
        {/* Top Header */}
        <header className={cn(
          "h-20 border-b backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between transition-colors",
          darkMode ? "bg-black/40 border-white/5" : "bg-white/80 border-[#14141410]"
        )}>
          <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
            <h2 className="font-serif italic text-lg md:text-2xl capitalize truncate">{activeTab}</h2>
            <div className="hidden sm:block h-6 w-px bg-[#14141410]" />
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {["GBP/USD", "XAU/USD", "EUR/USD"].map(sym => (
                <button
                  key={sym}
                  onClick={() => setSelectedSymbol(sym)}
                  className={cn(
                    "px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-bold tracking-tighter transition-all border whitespace-nowrap",
                    selectedSymbol === sym 
                      ? (darkMode ? "bg-white text-black border-white" : "bg-[#141414] text-white border-[#141414]")
                      : (darkMode ? "bg-transparent text-white/60 border-white/10 hover:border-white" : "bg-white text-[#141414] border-[#14141410] hover:border-[#141414]")
                  )}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-2 rounded-xl border transition-all hover:bg-[#14141405]",
                darkMode ? "border-white/10 text-white hover:bg-white/5" : "border-[#14141410] text-[#141414]"
              )}
            >
              {darkMode ? <Zap size={16} className="text-amber-400" /> : <Zap size={16} className="text-[#141414]" />}
            </button>
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-[#14141405] rounded-xl border border-[#14141405]">
              <div className={cn("w-2 h-2 rounded-full", isRunning ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                {isRunning ? "Engine Active" : "Engine Standby"}
              </span>
            </div>
            <button
              onClick={toggleBot}
              className={cn(
                "flex items-center gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-xl transition-all active:scale-95 shadow-sm",
                isRunning 
                  ? "bg-white border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white" 
                  : "bg-[#141414] text-white hover:opacity-90"
              )}
            >
              {isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              <span className="text-[8px] md:text-xs uppercase font-bold tracking-widest">
                {isRunning ? "Halt" : "Deploy"}
              </span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8"
              >
                {/* Main Chart Bento */}
                <div className={cn(
                  "lg:col-span-8 rounded-3xl p-4 md:p-8 shadow-sm border h-[400px] md:h-[540px] flex flex-col transition-colors",
                  darkMode ? "bg-[#141414] border-white/5" : "bg-white border-[#14141405]"
                )}>
                  <div className="flex justify-between items-start mb-4 md:mb-8">
                    <div>
                      <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1">Market Analysis</p>
                      <h3 className="text-2xl md:text-4xl font-serif italic flex items-baseline gap-2 md:gap-3">
                        ${(currentPrices[selectedSymbol] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[10px] md:text-xs font-mono text-emerald-500 font-bold">+2.45%</span>
                      </h3>
                    </div>
                    <div className="flex gap-1 md:gap-2">
                      <button className="p-1 md:p-2 hover:bg-[#14141405] rounded-lg transition-colors"><RefreshCw size={14} className="opacity-40" /></button>
                      <button className="p-1 md:p-2 hover:bg-[#14141405] rounded-lg transition-colors"><Search size={14} className="opacity-40" /></button>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={priceHistory[selectedSymbol]}>
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#141414" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141408" />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }}
                          cursor={{ stroke: '#14141420', strokeWidth: 1 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#141414" 
                          strokeWidth={3} 
                          fill="url(#chartGradient)" 
                          animationDuration={800}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 pt-4 md:pt-8 mt-4 md:mt-8 border-t border-[#14141408]">
                    {[
                      { label: "24h High", value: "$62,450" },
                      { label: "24h Low", value: "$58,120" },
                      { label: "Volume", value: "1.2B" },
                      { label: "Market Cap", value: "1.1T" },
                    ].map((item, i) => (
                      <div key={i}>
                        <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-30 mb-1">{item.label}</p>
                        <p className="text-xs md:text-sm font-mono font-bold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Book Bento */}
                <div className={cn(
                  "lg:col-span-4 rounded-3xl p-4 md:p-8 shadow-sm border h-[400px] md:h-[540px] flex flex-col transition-colors",
                  darkMode ? "bg-[#141414] border-white/5" : "bg-white border-[#14141405]"
                )}>
                  <h3 className="text-base md:text-lg font-serif italic mb-4 md:mb-6">Order Book</h3>
                  <div className="grid grid-cols-2 text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2 md:mb-4">
                    <span>Price</span>
                    <span className="text-right">Size</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {/* Asks */}
                    <div className="flex flex-col-reverse gap-1">
                      {activeOrderBook?.asks.map((ask, i) => (
                        <div key={i} className="relative h-5 md:h-6 flex items-center group">
                          <div className="absolute inset-0 bg-red-500/5 origin-right" style={{ width: `${(ask.size / 2) * 100}%` }} />
                          <span className="text-[8px] md:text-[10px] font-mono text-red-500 z-10">{ask.price.toFixed(2)}</span>
                          <span className="ml-auto text-[8px] md:text-[10px] font-mono opacity-60 z-10">{ask.size.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="py-2 md:py-4 my-1 md:my-2 border-y border-[#14141408] flex justify-between items-center">
                      <span className="text-lg md:text-xl font-serif italic">${(currentPrices[selectedSymbol] ?? 0).toFixed(2)}</span>
                      <span className="text-[8px] md:text-[10px] font-mono opacity-40">Spread: 0.01%</span>
                    </div>

                    {/* Bids */}
                    <div className="flex flex-col gap-1">
                      {activeOrderBook?.bids.map((bid, i) => (
                        <div key={i} className="relative h-5 md:h-6 flex items-center group">
                          <div className="absolute inset-0 bg-emerald-500/5 origin-right" style={{ width: `${(bid.size / 2) * 100}%` }} />
                          <span className="text-[8px] md:text-[10px] font-mono text-emerald-500 z-10">{bid.price.toFixed(2)}</span>
                          <span className="ml-auto text-[8px] md:text-[10px] font-mono opacity-60 z-10">{bid.size.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MT5 Connection Bento */}
                <div className="lg:col-span-4 bg-[#141414] text-white rounded-3xl p-4 md:p-8 shadow-xl border border-white/10 flex flex-col gap-4 md:gap-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base md:text-lg font-serif italic">MT5 Terminal</h3>
                    <div className={cn("px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest", mt5Status.connected ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                      {mt5Status.connected ? "Connected" : "Offline"}
                    </div>
                  </div>

                  {!mt5Status.connected ? (
                    <div className="space-y-3 md:space-y-4">
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[10px] uppercase font-bold opacity-40">Account Login</label>
                        <input 
                          type="text" 
                          value={mt5Creds.login}
                          onChange={e => setMt5Creds({...mt5Creds, login: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm focus:border-emerald-500 outline-none transition-colors" 
                          placeholder="50123456"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[10px] uppercase font-bold opacity-40">Password</label>
                        <input 
                          type="password" 
                          value={mt5Creds.password}
                          onChange={e => setMt5Creds({...mt5Creds, password: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm focus:border-emerald-500 outline-none transition-colors" 
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] md:text-[10px] uppercase font-bold opacity-40">Server</label>
                        <input 
                          type="text" 
                          value={mt5Creds.server}
                          onChange={e => setMt5Creds({...mt5Creds, server: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm focus:border-emerald-500 outline-none transition-colors" 
                        />
                      </div>
                      <button 
                        disabled={isConnecting}
                        onClick={async () => {
                          setIsConnecting(true);
                          const res = await fetch('/api/mt5/login', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(mt5Creds)
                          });
                          if (res.ok) fetch('/api/mt5/status').then(res => res.json()).then(setMt5Status);
                          setIsConnecting(false);
                        }}
                        className="w-full bg-emerald-500 text-[#141414] font-bold py-2 md:py-3 rounded-xl text-[10px] md:text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50"
                      >
                        {isConnecting ? "Establishing..." : "Connect Terminal"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 md:space-y-6">
                      <div className="grid grid-cols-2 gap-2 md:gap-4">
                        <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[8px] uppercase opacity-40 mb-1">Balance</p>
                          <p className="text-base md:text-xl font-mono">${mt5Status.account?.balance.toLocaleString()}</p>
                        </div>
                        <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[8px] uppercase opacity-40 mb-1">Equity</p>
                          <p className="text-base md:text-xl font-mono">${mt5Status.account?.equity.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="h-24 md:h-32 bg-black/40 rounded-xl p-3 md:p-4 font-mono text-[8px] md:text-[10px] overflow-y-auto border border-white/5">
                        {mt5Status.logs.map((log, i) => (
                          <div key={i} className="opacity-60 mb-1">{log}</div>
                        ))}
                      </div>
                      <button className="w-full border border-white/10 py-1.5 md:py-2 rounded-xl text-[8px] md:text-[10px] uppercase font-bold opacity-40 hover:opacity-100 transition-opacity">Disconnect</button>
                    </div>
                  )}
                </div>

                {/* Stats Row */}
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8">
                  {[
                    { label: "Portfolio PnL", value: `$${(stats.net_pnl ?? 0).toLocaleString()}`, icon: ArrowUpRight, color: "text-emerald-500" },
                    { label: "Active Positions", value: "3", icon: Layers, color: darkMode ? "text-white" : "text-[#141414]" },
                    { label: "Win Rate", value: "64.2%", icon: Zap, color: "text-amber-500" },
                    { label: "Security Status", value: "Encrypted", icon: Lock, color: "text-blue-500" },
                  ].map((stat, i) => (
                    <div key={i} className={cn(
                      "rounded-3xl p-4 md:p-6 shadow-sm border flex flex-col sm:flex-row items-center gap-2 md:gap-6 group hover:scale-[1.02] transition-all text-center sm:text-left",
                      darkMode ? "bg-[#141414] border-white/5" : "bg-white border-[#14141405]"
                    )}>
                      <div className={cn("w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center", darkMode ? "bg-white/5" : "bg-[#14141405]", stat.color)}>
                        <stat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-30 mb-1">{stat.label}</p>
                        <p className="text-lg md:text-2xl font-serif italic">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Trades Bento */}
                <div className={cn(
                  "lg:col-span-12 rounded-3xl p-4 md:p-8 shadow-sm border transition-colors",
                  darkMode ? "bg-[#141414] border-white/5" : "bg-white border-[#14141405]"
                )}>
                  <div className="flex justify-between items-center mb-4 md:mb-8">
                    <h3 className="text-base md:text-xl font-serif italic">Recent Executions</h3>
                    <button onClick={() => setActiveTab('trades')} className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 flex items-center gap-1 transition-opacity">
                      View Full History <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="hidden sm:grid grid-cols-6 text-[10px] uppercase tracking-widest font-bold opacity-30 mb-6 px-4">
                    <span>Asset</span>
                    <span>Type</span>
                    <span>Price</span>
                    <span>Amount</span>
                    <span>Strategy</span>
                    <span className="text-right">Time</span>
                  </div>
                  <div className="space-y-2">
                    {trades.slice(0, 5).map((trade, i) => (
                      <div key={i} className="grid grid-cols-3 sm:grid-cols-6 items-center p-3 md:p-4 rounded-2xl hover:bg-[#14141405] transition-colors group">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#141414] text-white flex items-center justify-center text-[8px] md:text-[10px] font-bold">
                            {trade.symbol.split('/')[0]}
                          </div>
                          <span className="text-xs md:text-sm font-bold">{trade.symbol}</span>
                        </div>
                        <span className={cn("text-[10px] md:text-xs font-bold", trade.type === 'BUY' ? "text-emerald-500" : "text-red-500")}>
                          {trade.type}
                        </span>
                        <span className="hidden sm:block text-xs md:text-sm font-mono opacity-60 group-hover:opacity-100">${trade.price.toLocaleString()}</span>
                        <span className="hidden sm:block text-xs md:text-sm font-mono opacity-60 group-hover:opacity-100">{trade.amount}</span>
                        <span className="hidden sm:block text-[10px] uppercase tracking-widest font-bold opacity-40">{trade.strategy}</span>
                        <span className="text-[10px] md:text-xs font-mono opacity-40 text-right">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8"
              >
                <div className={cn(
                  "lg:col-span-4 rounded-3xl p-4 md:p-8 shadow-sm border transition-colors",
                  darkMode ? "bg-[#141414] border-white/5" : "bg-white border-[#14141405]"
                )}>
                  <h3 className="text-base md:text-lg font-serif italic mb-4 md:mb-8 text-inherit">Asset Distribution</h3>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'GBP', value: 40 },
                            { name: 'XAU', value: 35 },
                            { name: 'EUR', value: 25 },
                          ]}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {COLORS.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 md:space-y-4 mt-4 md:mt-8">
                    {['GBP', 'XAU', 'EUR'].map((asset, i) => (
                      <div key={asset} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-[10px] md:text-xs font-bold text-inherit">{asset}</span>
                        </div>
                        <span className="text-[10px] md:text-xs font-mono opacity-60 text-inherit">{[40, 35, 25][i]}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn(
                  "lg:col-span-8 rounded-3xl p-4 md:p-8 shadow-sm border transition-colors",
                  darkMode ? "bg-[#141414] border-white/5" : "bg-white border-[#14141405]"
                )}>
                  <h3 className="text-base md:text-lg font-serif italic mb-4 md:mb-8 text-inherit">Performance Metrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                    <div className={cn("p-4 md:p-6 rounded-2xl", darkMode ? "bg-white/5" : "bg-[#14141405]")}>
                      <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2 text-inherit">Sharpe Ratio</p>
                      <p className="text-2xl md:text-3xl font-serif italic text-inherit">2.45</p>
                      <div className={cn("h-1 w-full mt-4 rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-[#14141410]")}>
                        <div className="h-full bg-emerald-500 w-[75%]" />
                      </div>
                    </div>
                    <div className={cn("p-4 md:p-6 rounded-2xl", darkMode ? "bg-white/5" : "bg-[#14141405]")}>
                      <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2 text-inherit">Max Drawdown</p>
                      <p className="text-2xl md:text-3xl font-serif italic text-inherit">-4.12%</p>
                      <div className={cn("h-1 w-full mt-4 rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-[#14141410]")}>
                        <div className="h-full bg-red-500 w-[20%]" />
                      </div>
                    </div>
                    <div className={cn("p-4 md:p-6 rounded-2xl", darkMode ? "bg-white/5" : "bg-[#14141405]")}>
                      <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2 text-inherit">Avg. Trade Duration</p>
                      <p className="text-2xl md:text-3xl font-serif italic text-inherit">14m 22s</p>
                    </div>
                    <div className={cn("p-4 md:p-6 rounded-2xl", darkMode ? "bg-white/5" : "bg-[#14141405]")}>
                      <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2 text-inherit">Profit Factor</p>
                      <p className="text-2xl md:text-3xl font-serif italic text-inherit">1.82</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'trades' && (
              <motion.div key="trades" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn(
                "rounded-3xl shadow-sm border overflow-hidden transition-colors",
                darkMode ? "bg-[#141414] border-white/5" : "bg-white border-[#14141405]"
              )}>
                <div className={cn(
                  "grid grid-cols-3 sm:grid-cols-6 p-4 md:p-6 border-b text-white",
                  darkMode ? "bg-black/40 border-white/5" : "bg-[#141414] border-[#14141408]"
                )}>
                  {['Timestamp', 'Symbol', 'Type', 'Price', 'Amount', 'Strategy'].map((h, i) => (
                    <span key={h} className={cn("text-[8px] md:text-[10px] uppercase font-bold tracking-widest opacity-60", i > 2 && "hidden sm:block")}>{h}</span>
                  ))}
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  {trades.map((trade, i) => (
                    <div key={i} className={cn(
                      "grid grid-cols-3 sm:grid-cols-6 p-4 md:p-6 border-b transition-colors items-center",
                      darkMode ? "border-white/5 hover:bg-white/5" : "border-[#14141405] hover:bg-[#14141402]"
                    )}>
                      <span className="text-[10px] font-mono opacity-40 text-inherit">{new Date(trade.timestamp).toLocaleString()}</span>
                      <span className="text-xs md:text-sm font-bold text-inherit">{trade.symbol}</span>
                      <span className={cn("text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg w-fit", trade.type === 'BUY' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{trade.type}</span>
                      <span className="hidden sm:block text-xs md:text-sm font-mono text-inherit">${trade.price.toLocaleString()}</span>
                      <span className="hidden sm:block text-xs md:text-sm font-mono text-inherit">{trade.amount}</span>
                      <span className="hidden sm:block text-[8px] md:text-[10px] uppercase tracking-widest font-bold opacity-40 text-inherit">{trade.strategy}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#141414] text-white p-4 md:p-8 rounded-3xl shadow-2xl font-mono text-[10px] md:text-xs h-[60vh] md:h-[70vh] overflow-y-auto flex flex-col-reverse border border-white/10">
                <div ref={logEndRef} />
                {logs.map((log, i) => (
                  <div key={i} className="mb-2 md:mb-3 flex flex-col sm:flex-row sm:gap-6 opacity-60 hover:opacity-100 transition-opacity group">
                    <span className="opacity-20 group-hover:opacity-40 text-[8px] md:text-[10px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <div className="flex gap-2 items-center">
                      <span className={cn(
                        "font-bold px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[10px]",
                        log.level === 'INFO' ? "bg-blue-500/20 text-blue-400" : 
                        log.level === 'SYSTEM' ? "bg-amber-500/20 text-amber-400" : 
                        "bg-emerald-500/20 text-emerald-400"
                      )}>{log.level}</span>
                      <span className="leading-relaxed text-[10px] md:text-xs">{log.message}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'code' && (
              <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 gap-8">
                <div className={cn(
                  "p-4 md:p-8 rounded-3xl shadow-2xl font-mono text-[10px] md:text-xs overflow-x-auto border transition-colors",
                  darkMode ? "bg-[#141414] text-emerald-400 border-white/10" : "bg-white text-emerald-600 border-[#14141405]"
                )}>
                  <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500/20" />
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-500/20" />
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500/20" />
                      <span className={cn("uppercase tracking-widest text-[8px] md:text-[10px] ml-2 md:ml-4", darkMode ? "text-white/40" : "text-black/40")}>ict_strategy_2022.py</span>
                    </div>
                    <button className={cn("uppercase font-bold tracking-widest text-[8px] md:text-[10px]", darkMode ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black")}>Copy</button>
                  </div>
                  <pre className="leading-relaxed whitespace-pre-wrap">
                    {`# ict_strategy_2022.py
class ICT2022Model:
    def __init__(self, timeframe='15M'):
        self.bias_engine = '15M'
        self.execution_tf = '1M'
        
    def analyze_bias(self, range_high, range_low, current_price):
        equilibrium = (range_high + range_low) / 2
        # Above 50% = Premium (Sells) | Below 50% = Discount (Buys)
        return 'PREMIUM' if current_price > equilibrium else 'DISCOUNT'

    def check_setup(self, context):
        # 1. Wait for Liquidity Sweep (PDH/PDL/Session)
        if not context.liquidity_swept: return None
        
        # 2. Market Structure Shift (MSS) with Displacement
        if not context.mss_detected: return None
        
        # 3. Fair Value Gap (FVG) Identification
        if context.fvg_zone:
            return {
                'entry': context.fvg_zone.midpoint,
                'sl': context.sweep_extreme,
                'tp': context.opposing_liquidity,
                'rr': context.calculate_rr()
            }
        return None`}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
