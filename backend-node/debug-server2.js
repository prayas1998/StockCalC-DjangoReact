const http = require('http');

console.log('Step 1: Creating server...');

const server = http.createServer();

console.log('Step 2: Setting up request handler...');

server.on('request', (req, res) => {
  console.log('✅ REQUEST RECEIVED:', req.method, req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

console.log('Step 3: Starting server...');

try {
  server.listen(3002, () => {
    console.log('✅ SUCCESS: Server bound to port 3002');
    console.log('Step 4: Testing internally...');
    
    // Immediate internal test
    const http = require('http');
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3002,
      path: '/',
      method: 'GET'
    }, (res) => {
        console.log('✅ INTERNAL TEST: Response received:', res.statusCode);
        res.on('data', () => {});
        res.on('end', () => {
          console.log('✅ INTERNAL TEST: Complete');
        });
      });
    
    req.on('error', (e) => {
      console.error('❌ INTERNAL TEST FAILED:', e.message);
    });
    
    req.end();
  });
} catch (error) {
  console.error('❌ FAILED TO START:', error);
}

server.on('error', (err) => {
  console.error('❌ SERVER ERROR:', err);
});

console.log('Step 5: Server setup complete');