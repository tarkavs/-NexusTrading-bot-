const term = document.getElementById('terminal');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const balanceText = document.getElementById('balance-text');
const equityText = document.getElementById('equity-text');
const connectBtn = document.getElementById('connect-btn');

function addLog(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">${time}</span> ${message}`;
    term.appendChild(entry);
    term.scrollTop = term.scrollHeight;
}

async function handleConnect() {
    const login = document.getElementById('login').value;
    const mainPassword = document.getElementById('mainPassword').value;
    const investorPassword = document.getElementById('investorPassword').value;
    const server = document.getElementById('server').value;
    const isInvestor = document.getElementById('isInvestor').checked;

    if (!login || !server) {
        addLog("Error: Login and Server are required.");
        return;
    }

    connectBtn.disabled = true;
    connectBtn.innerText = "Connecting...";
    addLog(`Initiating handshake with ${server}...`);

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                login,
                mainPassword,
                investorPassword,
                server,
                isInvestor
            })
        });

        const data = await response.json();

        if (response.ok) {
            addLog("Handshake successful. Session established.");
        } else {
            addLog(`Connection Failed: ${data.message}`);
        }
    } catch (error) {
        addLog(`Network Error: ${error.message}`);
    } finally {
        connectBtn.disabled = false;
        connectBtn.innerText = "Connect Terminal";
    }
}

async function pollStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        if (data.connected) {
            statusIndicator.className = 'indicator online';
            statusText.innerHTML = '<span class="indicator online"></span> Online';
            if (data.account) {
                balanceText.innerText = `$${data.account.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                equityText.innerText = `$${data.account.equity.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            }
        } else {
            statusIndicator.className = 'indicator offline';
            statusText.innerHTML = '<span class="indicator offline"></span> Offline';
        }

        // Sync logs
        if (data.logs && data.logs.length > 0) {
            // Simple sync: if terminal is empty or last log is different
            const lastLog = data.logs[data.logs.length - 1];
            const currentLastLog = term.lastElementChild?.innerText;
            if (!currentLastLog || !currentLastLog.includes(lastLog.split('] ')[1])) {
                // For simplicity in this demo, we just clear and re-render if logs changed
                // In a real app, we'd only append new ones
                term.innerHTML = '';
                data.logs.forEach(log => {
                    const entry = document.createElement('div');
                    entry.className = 'log-entry';
                    entry.innerText = log;
                    term.appendChild(entry);
                });
                term.scrollTop = term.scrollHeight;
            }
        }

    } catch (error) {
        console.error("Polling error:", error);
    }
}

connectBtn.addEventListener('click', handleConnect);

// Poll every 2 seconds
setInterval(pollStatus, 2000);
pollStatus();
