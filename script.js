// script.js
const app_id = 72379;
const redirect_uri = "https://deriv.com/";
const loginBtn = document.getElementById("login-btn");
const tradePanel = document.getElementById("trade-panel");
const accountInfo = document.getElementById("account-info");
const logDiv = document.getElementById("log");
const adminPanel = document.getElementById("admin-panel");

let ws;
let client_token;
let copy_tokens = [];

// Connect WebSocket
function connectWebSocket(token) {
  ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=" + app_id);
  ws.onopen = () => {
    ws.send(JSON.stringify({ authorize: token }));
  };
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.msg_type === "authorize") {
      accountInfo.innerText = `Hello, ${data.authorize.loginid}`;
      tradePanel.style.display = "block";
      if (data.authorize.is_virtual === 0) adminPanel.style.display = "block";
    } else if (data.msg_type === "buy") {
      logDiv.innerText += `\nContract Bought: ${data.buy.transaction_id}`;
    } else {
      console.log(data);
    }
  };
}

// Login
loginBtn.onclick = () => {
  const authUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${app_id}&redirect_uri=${redirect_uri}`;
  window.location.href = authUrl;
};

// Read token from URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("token")) {
  client_token = urlParams.get("token");
  connectWebSocket(client_token);
}

// Place Trade
function placeTrade() {
  const symbol = document.getElementById("symbol").value;
  const contract = document.getElementById("contract").value;
  const duration = +document.getElementById("duration").value;
  const stake = +document.getElementById("stake").value;

  const proposal = {
    buy: 1,
    price: stake,
    parameters: {
      amount: stake,
      basis: "stake",
      contract_type: contract,
      currency: "USD",
      duration: duration,
      duration_unit: "m",
      symbol: symbol
    }
  };

  ws.send(JSON.stringify(proposal));
}

// Admin: Save & Load Tokens
function saveTokens() {
  const raw = document.getElementById("client-tokens").value.trim();
  localStorage.setItem("copy_tokens", raw);
  alert("Tokens saved.");
}

function clearTokens() {
  localStorage.removeItem("copy_tokens");
  document.getElementById("client-tokens").value = "";
  alert("Tokens cleared.");
}

function loadTokens() {
  const stored = localStorage.getItem("copy_tokens");
  if (stored) {
    document.getElementById("client-tokens").value = stored;
    copy_tokens = stored.split("\n").map(t => t.trim()).filter(t => t);
  }
}

loadTokens();

// Admin: Copy Trade
function copyTrade() {
  const symbol = document.getElementById("symbol").value;
  const contract = document.getElementById("contract").value;
  const duration = +document.getElementById("duration").value;
  const stake = +document.getElementById("stake").value;
  const mirror = document.getElementById("mirror-stake").checked;

  const tokens = document.getElementById("client-tokens").value.trim().split("\n");

  for (const token of tokens) {
    const sock = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=" + app_id);
    sock.onopen = () => {
      sock.send(JSON.stringify({ authorize: token.trim() }));
    };
    sock.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.msg_type === "authorize") {
        sock.send(JSON.stringify({
          buy: 1,
          price: mirror ? stake : 1,
          parameters: {
            amount: mirror ? stake : 1,
            basis: "stake",
            contract_type: contract,
            currency: "USD",
            duration: duration,
            duration_unit: "m",
            symbol: symbol
          }
        }));
      }
    };
  }
}
