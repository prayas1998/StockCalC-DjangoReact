const http = require('http');

console.log('Starting simple CommonJS server...');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.method, req.url);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Simple CommonJS server is working!'
  }));
});

// Try multiple approaches
const PORT = process.env.PORT || 3001;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ CommonJS server successfully bound to http://127.0.0.1:${PORT}`);
  console.log(`Try: curl http://127.0.0.1:${PORT}/`);
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use`);
  } else if (err.code === 'EACCES') {
    console.log(`Permission denied for port ${PORT}`);
  }
});

// Force immediate test
setTimeout(() => {
  console.log('Checking if server is actually bound...');
  const http = require('http');
  const testReq = http.request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/',
    method: 'GET',
    timeout: 1000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ Self-test successful:', data);
    });
  });
  
  testReq.on('error', (err) => {
    console.error('❌ Self-test failed:', err.message);
  });
  
  testReq.end();
}, 1000);