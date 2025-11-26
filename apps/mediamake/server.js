/**
 * Custom Next.js Server with Extended Timeouts
 * 
 * This server is needed for GitHub Actions workflow because:
 * - The `maxDuration` export in route handlers only works on Vercel
 * - `next start` uses default Node.js HTTP timeouts (5 minutes)
 * - We need longer timeouts for complex preset generation (15+ minutes)
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Configure extended timeouts for long-running AI operations
  // Default Node.js timeout is 120 seconds (2 minutes)
  // Vercel Pro allows up to 60 seconds, Enterprise up to 900 seconds
  
  // Request timeout: 20 minutes (1200 seconds) for complex preset generation
  server.timeout = 20 * 60 * 1000; // 20 minutes in milliseconds
  
  // Headers timeout: slightly longer than request timeout
  server.headersTimeout = 20 * 60 * 1000 + 5000; // 20 minutes + 5 seconds
  
  // Keep-alive timeout: 65 seconds (standard for load balancers)
  server.keepAliveTimeout = 65 * 1000;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Request timeout: ${server.timeout / 1000}s`);
    console.log(`> Headers timeout: ${server.headersTimeout / 1000}s`);
    console.log(`> Keep-alive timeout: ${server.keepAliveTimeout / 1000}s`);
  });
});

