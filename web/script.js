async function fetchTrades() {
    const tbody = document.getElementById('trades-body');
    
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.5;">No trades found in database.</td></tr>';
            return;
        }

        data.forEach(trade => {
            const row = document.createElement('tr');
            
            const sideClass = trade.side.toUpperCase() === 'BUY' ? 'side-buy' : 'side-sell';
            
            row.innerHTML = `
                <td style="font-family: monospace; font-size: 0.9em;">${trade.timestamp}</td>
                <td style="font-weight: bold;">${trade.symbol}</td>
                <td class="${sideClass}">${trade.side}</td>
                <td style="font-family: monospace;">$${parseFloat(trade.price).toFixed(2)}</td>
                <td style="font-family: monospace;">${trade.amount}</td>
            `;
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching trades:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading data.</td></tr>';
    }
}

// Initial fetch
fetchTrades();

// Auto-refresh every 10 seconds
setInterval(fetchTrades, 10000);
