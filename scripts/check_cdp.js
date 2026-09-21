const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9222',
  'http://localhost:5000/index.html'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    console.log('Tabs:', tabs.map(t => ({ title: t.title, url: t.url, ws: t.webSocketDebuggerUrl })));
    
    if (tabs.length > 0 && tabs[0].webSocketDebuggerUrl) {
      const WebSocket = require('ws'); // wait, is ws installed? let's check
    }
  } catch (e) {
    console.error('Fetch error:', e);
  } finally {
    child.kill();
  }
}, 2000);
