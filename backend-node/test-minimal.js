const { createServer } = require('http');

const server = createServer((req, res) => {
  console.log('Request received:', req.method, req.url);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    path: req.url
  }));
});

server.listen(8000, () => {
  console.log('Test server running on http://localhost:8000');
});