const express = require('express');
const fs = require('node:fs');
const { promises: fsPromises } = require('node:fs');
const path = require('node:path');
const chalk = require('chalk');
const compression = require('compression');
const config = require('../json/settings.json');
const { networkInterfaces } = require('node:os');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const logger = {
  info:  (message) => console.log(chalk.dim.blue('•')   + chalk.dim(' info  - ') + message),
  ready: (message) => console.log(chalk.dim.green('•')  + chalk.dim(' ready - ') + message),
  warn:  (message) => console.log(chalk.dim.yellow('•') + chalk.dim(' warn  - ') + message),
  error: (message) => console.log(chalk.dim.red('•')    + chalk.dim(' error - ') + message),
};

// ─── Notification cache ────────────────────────────────────────────────────────
let notificationsCache = [];
const JSON_DIR   = path.join(__dirname, '..', 'json');
const NOTIF_PATH = path.join(JSON_DIR, 'notif.json');

async function loadNotifications() {
  try {
    const raw = await fsPromises.readFile(NOTIF_PATH, 'utf8');
    notificationsCache = JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn(`Failed to load notifications: ${err.message}`);
    notificationsCache = [];
  }
}

async function saveNotifications() {
  try {
    await fsPromises.writeFile(NOTIF_PATH, JSON.stringify(notificationsCache, null, 2));
  } catch (err) {
    logger.error(`Failed to save notifications: ${err.message}`);
  }
}

// ─── Core setup ───────────────────────────────────────────────────────────────
logger.info('Starting server initialization...');

app.set('trust proxy', true);
app.set('json spaces', isProduction ? 0 : 2);

app.use(compression({ threshold: 1024, level: isProduction ? 9 : 6 }));

const WEB_DIR = path.join(__dirname, 'web');
app.use('/', express.static(WEB_DIR, {
  maxAge: isProduction ? 86400000 : 0,
  etag: true,
  lastModified: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Stamp every request with a start time
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// ─── UNIVERSAL RESPONSE WRAPPER ───────────────────────────────────────────────
// Intercepts ALL res.json() and res.send() calls so every JSON response
// — objects, arrays, nulls, primitives — is guaranteed to be wrapped.
//
// UPDATED: Meta info (operator, timestamp, responseTime) now appears FIRST
// before the actual result/data.
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  /**
   * Builds the standard envelope around any payload.
   *
   * Rules (UPDATED ORDER):
   *  • Meta fields (operator, timestamp, responseTime) are placed FIRST
   *  • Plain object   → meta + spread its keys
   *  • Array          → meta + { result: [...] }
   *  • null/undefined → meta + { result: null }
   *  • Primitive      → meta + { result: <value> }
   *  • Already-wrapped (has __wrapped flag) → return as-is (no double-wrap)
   */
  function wrapResponse(data) {
    const meta = {
      operator:     config.operator || '',
      timestamp:    new Date().toISOString(),
      responseTime: `${Date.now() - req.startTime}ms`,
    };

    // Guard: never double-wrap
    if (data && typeof data === 'object' && data.__wrapped === true) {
      return data;
    }

    let envelope;

    if (data === null || data === undefined) {
      envelope = { ...meta, result: null };
    } else if (Array.isArray(data)) {
      envelope = { ...meta, result: data };
    } else if (typeof data === 'object') {
      envelope = { ...meta, ...data };
    } else {
      // string, number, boolean
      envelope = { ...meta, result: data };
    }

    // Mark as wrapped so re-entrant calls skip wrapping
    Object.defineProperty(envelope, '__wrapped', { value: true, enumerable: false });

    return envelope;
  }

  // Override res.json — the single source of truth for all JSON output
  res.json = function (data) {
    return originalJson(wrapResponse(data));
  };

  // Override res.send — redirect object/array bodies through res.json
  res.send = function (body) {
    if (body !== null && typeof body === 'object' && !Buffer.isBuffer(body)) {
      return res.json(body);
    }
    return originalSend(body);
  };

  next();
});

// ─── Dynamic endpoint loader ──────────────────────────────────────────────────
async function loadEndpointsFromDirectory(directory, categoryPath = '') {
  let endpoints = [];
  const fullPath = path.join(__dirname, '..', directory);

  if (!fs.existsSync(fullPath)) {
    logger.warn(`Directory not found: ${fullPath}`);
    return endpoints;
  }

  logger.info(`Scanning directory: ${directory}...`);

  for (const item of fs.readdirSync(fullPath)) {
    const itemPath = path.join(fullPath, item);
    const stats    = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      const subCategory = categoryPath ? `${categoryPath}/${item}` : item;
      endpoints = endpoints.concat(
        await loadEndpointsFromDirectory(path.join(directory, item), subCategory)
      );
    } else if (stats.isFile() && item.endsWith('.js')) {
      try {
        const mod = require(itemPath);

        if (mod && typeof mod.onStart === 'function') {
          const name    = item.replace('.js', '');
          const cat     = mod.meta.category || (categoryPath || 'other');
          const catSlug = cat.toLowerCase().replace(/[ /]/g, '-');

          const originalPath = mod.meta.path
            ? mod.meta.path.split('?')[0]
            : `/${catSlug}/${name}`;

          // Force /api prefix
          const route = originalPath.startsWith('/api')
            ? originalPath
            : '/api' + (originalPath.startsWith('/') ? originalPath : '/' + originalPath);

          app.all(route, async (req, res, next) => {
            try {
              await mod.onStart({ req, res });
            } catch (err) {
              next(err);
            }
          });

          // Build display path (keeps query string intact)
          let displayPath;
          if (mod.meta.path) {
            const hasQuery  = mod.meta.path.includes('?');
            const pathPart  = hasQuery ? mod.meta.path.split('?')[0] : mod.meta.path;
            const queryPart = hasQuery ? '?' + mod.meta.path.split('?')[1] : '';
            const apiPath   = pathPart.startsWith('/api')
              ? pathPart
              : '/api' + (pathPart.startsWith('/') ? pathPart : '/' + pathPart);
            displayPath = apiPath + queryPart;
          } else {
            displayPath = route;
          }

          // Parse query params for docs.html
          let parsedParams = [];
          if (mod.meta.path && mod.meta.path.includes('?')) {
            const queryPart = mod.meta.path.split('?')[1];
            if (queryPart) {
              parsedParams = queryPart.split('&').map(pair => {
                const [pname, pval = ''] = pair.split('=');
                return { name: pname, example: pval, desc: `Input your ${pname} here`, required: true };
              });
            }
          }

          let bucket = endpoints.find(e => e.name === cat);
          if (!bucket) {
            bucket = { name: cat, items: [] };
            endpoints.push(bucket);
          }

          const methods = Array.isArray(mod.meta.method)
            ? mod.meta.method.map(m => m.toUpperCase())
            : [mod.meta.method?.toUpperCase() || 'GET'];

          bucket.items.push({ ...mod.meta, path: displayPath, params: parsedParams, methods });

          logger.ready(`${chalk.green(route)} ${chalk.dim('(')}${chalk.cyan(cat)}${chalk.dim(')')}`);
        }
      } catch (error) {
        logger.error(`Failed to load module ${itemPath}: ${error.message}`);
      }
    }
  }

  return endpoints;
}

// ─── Static HTML pages (intentionally not wrapped) ────────────────────────────
app.get('/',    (req, res) => res.sendFile(path.join(WEB_DIR, 'gate.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(WEB_DIR, 'docs.html')));

// ─── Built-in JSON routes ──────────────────────────────────────────────────────
let allEndpoints   = [];
let totalEndpoints = 0;

app.get('/endpoints',     (req, res) => res.json({ status: true, count: totalEndpoints, endpoints: allEndpoints }));
app.get('/set',           (req, res) => res.json({ status: true, ...config, notification: notificationsCache }));
app.get('/notifications', (req, res) => res.json({ notifications: notificationsCache }));

// ─── Admin notification ────────────────────────────────────────────────────────
app.post('/api/notification', async (req, res) => {
  const apiKey = process.env.API_KEY || config.key;
  if (req.headers.authorization !== apiKey)
    return res.status(401).json({ status: false, error: 'Unauthorized' });

  const { message, clear, firstName } = req.body;

  if (clear) {
    notificationsCache = [];
    await saveNotifications();
    return res.json({ status: true, cleared: true });
  }

  if (!message)
    return res.status(400).json({ status: false, error: 'Missing message' });

  notificationsCache.push({
    id:        Date.now(),
    title:     `From Developer ${firstName || ''}`.trim(),
    message:   message.trim(),
    createdAt: Date.now(),
  });
  await saveNotifications();
  res.json({ status: true });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
(async () => {
  await loadNotifications();

  logger.info('Loading API endpoints...');
  allEndpoints   = await loadEndpointsFromDirectory('apis');
  totalEndpoints = allEndpoints.reduce((total, cat) => total + cat.items.length, 0);
  logger.ready(`Loaded ${totalEndpoints} endpoints`);

  // ✅ Error handlers registered AFTER all dynamic routes are loaded

  // 404 — JSON for /api/* requests, HTML page for everything else
  app.use((req, res) => {
    logger.info(`404: ${req.method} ${req.path}`);
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ status: false, error: 'Endpoint not found' });
    }
    res.status(404).sendFile(path.join(WEB_DIR, 'err', '404.html'));
  });

  // 500 — JSON for /api/* requests, HTML page for everything else
  app.use((err, req, res, next) => {
    logger.error(`500: ${err.message}`);
    if (req.path.startsWith('/api')) {
      return res.status(500).json({ status: false, error: err.message || 'Internal server error' });
    }
    res.status(500).sendFile(path.join(WEB_DIR, 'err', '500.html'));
  });

  app.listen(PORT, () => {
    logger.ready(`Server started successfully on port ${PORT}`);
    logger.info(`Local:   ${chalk.cyan(`http://localhost:${PORT}`)}`);

    try {
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            logger.info(`Network: ${chalk.cyan(`http://${net.address}:${PORT}`)}`);
          }
        }
      }
    } catch (e) {}

    logger.info(chalk.dim('Ready for connections'));
  });
})();