/**
 * Custom Next.js Server with Extended Timeouts
 * 
 * This server is required for:
 * 1. GitHub Actions preset generation (needs 15-20 minute timeouts)
 * 2. Local development with long-running AI operations
 * 
 * The default `next start` has a 5-minute timeout which is insufficient
 * for complex preset generation with multiple validation attempts.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // ========================================
  // EXTENDED TIMEOUTS FOR LONG AI OPERATIONS
  // ========================================
  
  // Request timeout: 20 minutes (for complex preset generation)
  // Default is 5 minutes (300,000ms) which is too short
  server.timeout = 30 * 60 * 1000; // 30 minutes
  
  // Headers timeout: Should be slightly higher than request timeout
  // This prevents the server from hanging if headers aren't sent
  server.headersTimeout = 30 * 60 * 1000 + 5000; // 30 min + 5 seconds
  
  // Keep-Alive timeout: Standard for load balancers
  // This is how long idle connections stay open
  server.keepAliveTimeout = 65 * 1000; // 65 seconds

  server.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`✅ Server ready on http://${hostname}:${port}`);
    console.log(`⏱️  Timeout settings:`);
    console.log(`   - Request timeout: ${server.timeout / 1000}s (${server.timeout / 60000} minutes)`);
    console.log(`   - Headers timeout: ${server.headersTimeout / 1000}s`);
    console.log(`   - Keep-Alive timeout: ${server.keepAliveTimeout / 1000}s`);
    console.log(`📝 Note: maxDuration exports in route files are Vercel-only and ignored here`);
  });
});

