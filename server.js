const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function readDatabase() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { orders: [], products: [], customers: [], staff: [] };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database:', err);
    return { orders: [], products: [], customers: [], staff: [] };
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // ==========================================
  // API ROUTING
  // ==========================================
  if (pathname.startsWith('/api/')) {
    
    // GET: Retrieve all data
    if (pathname === '/api/data' && req.method === 'GET') {
      const data = readDatabase();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
      return;
    }

    // POST: Create New Order
    if (pathname === '/api/orders' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const newOrder = JSON.parse(body);
          const db = readDatabase();
          newOrder.id = 'ORD-' + (Date.now().toString().slice(-4));
          newOrder.date = new Date().toISOString().replace('T', ' ').slice(0, 16);
          newOrder.status = newOrder.status || 'រង់ចាំវាស់វែង';
          db.orders.unshift(newOrder);

          // Update or add customer
          const existingCust = db.customers.find(c => c.phone === newOrder.phone);
          if (existingCust) {
            existingCust.ordersCount = (existingCust.ordersCount || 0) + 1;
            existingCust.totalSpent = (existingCust.totalSpent || 0) + (parseFloat(newOrder.totalAmount) || 0);
          } else {
            db.customers.unshift({
              id: Date.now(),
              name: newOrder.customerName,
              phone: newOrder.phone,
              address: newOrder.address,
              ordersCount: 1,
              totalSpent: parseFloat(newOrder.totalAmount) || 0,
              type: 'អតិថិជនថ្មី'
            });
          }

          writeDatabase(db);
          res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, order: newOrder }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // PUT: Update Order Status
    if (pathname.startsWith('/api/orders/') && req.method === 'PUT') {
      const orderId = pathname.split('/')[3];
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const db = readDatabase();
          const target = db.orders.find(o => o.id === orderId);
          if (target) {
            if (payload.status) target.status = payload.status;
            writeDatabase(db);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, order: target }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Order not found' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid data' }));
        }
      });
      return;
    }

    // POST / PUT: Update or Add Product
    if (pathname === '/api/products' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const product = JSON.parse(body);
          const db = readDatabase();
          if (product.id) {
            const index = db.products.findIndex(p => p.id === product.id);
            if (index !== -1) db.products[index] = product;
          } else {
            product.id = Date.now();
            db.products.push(product);
          }
          writeDatabase(db);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, product }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid data' }));
        }
      });
      return;
    }

    // API fallback
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // ==========================================
  // STATIC FILE SERVING
  // ==========================================
  let filePath = pathname === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 គេហទំព័រ & ប្រព័ន្ធ Admin វាំងនន ប៉ោយប៉ែត កំពុងដំណើរការ:`);
  console.log(`👉 គេហទំព័រអតិថិជន: http://localhost:${PORT}/index.html`);
  console.log(`👉 ផ្ទាំង Admin គ្រប់គ្រង: http://localhost:${PORT}/admin.html`);
  console.log(`=======================================================`);
});

