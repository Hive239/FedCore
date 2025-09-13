const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Test Server Works!</h1><p>If you can see this, networking is fine.</p>');
});

server.listen(3005, '0.0.0.0', () => {
  console.log('Test server running on http://localhost:3005');
  console.log('Please try accessing it in your browser');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep server running for 60 seconds
setTimeout(() => {
  console.log('Shutting down test server');
  process.exit(0);
}, 60000);