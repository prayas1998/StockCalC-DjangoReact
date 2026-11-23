const http = require('http');

console.log('🚀 Starting server with comprehensive error handling...');

const server = http.createServer();

server.on('request', (req, res) => {
  console.log('✅ REQUEST RECEIVED:', req.method, req.url);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Hono backend is working!',
    port: process.env.PORT || 9000
  }));
});

// Try binding to multiple interfaces/ports
const PORTS = [9000, 9001, 9002];
const INTERFACES = ['127.0.0.1', '0.0.0.0', 'localhost'];

let bound = false;

for (const port of PORTS) {
  if (bound) break;
  
  for (const host of INTERFACES) {
    if (bound) break;
    
    try {
      server.listen({ port, host, exclusive: true }, () => {
        console.log(`✅ SUCCESS: Server bound to ${host}:${port}`);
        console.log(`🌐 Try: curl http://${host}:${port}/`);
        console.log(`🔗 Try: curl http://127.0.0.1:${port}/`);
        
        bound = true;
        
        // Test immediately after binding
        setTimeout(() => {
          const http = require('http');
          const testReq = http.request({
            hostname: '127.0.0.1',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 2000
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
        }, 500);
      });
      
      server.on('error', () => {
        // Silent for this approach
      });
      
    } catch (e) {
      // Continue to next attempt
    }
  }
}

setTimeout(() => {
  if (!bound) {
    console.error('❌ FAILED: Could not bind to any port/interface');
    console.error('🔧 Try running with sudo or check macOS firewall');
    process.exit(1);
  }
}, 3000);