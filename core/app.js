const express = require('express');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== PATH CONSTANTS ======================
const ROOT = process.cwd();
const WEB_DIR = path.join(ROOT, 'core', 'web');
const JSON_DIR = path.join(ROOT, 'json');
const API_DIR = path.join(ROOT, 'api');
const ERR_DIR = path.join(ROOT, 'core', 'web', 'err');
const SETTINGS_PATH = path.join(JSON_DIR, 'settings.json');
const NOTIF_PATH = path.join(JSON_DIR, 'notif.json');

// ====================== CONFIG ======================
app.enable('trust proxy');
app.set('json spaces', 2);

// ====================== LOGGING HELPERS ======================
const log = {
  success: (msg) => console.log(chalk.bgHex('#90EE90').hex('#333').bold(msg)),
  load: (msg) => console.log(chalk.bgHex('#FFFF99').hex('#333').bold(msg)),
  handle: (msg) => console.log(chalk.bgHex('#99FF99').hex('#333').bold(msg)),
  warn: (msg) => console.warn(chalk.bgHex('#FF9999').hex('#333').bold(msg)),
  error: (msg) => console.error(chalk.bgHex('#FF9999').hex('#333').bold(msg)),
};

// ====================== MIDDLEWARE ======================
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Load settings
let settings;
try {
  settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  log.success('Settings loaded successfully');
} catch (err) {
  log.error(`❌ Failed to load settings.json: ${err.message}`);
  settings = {
    name: 'Aqua APIs',
    description: 'Simple and easy to use',
    key: '',
    operator: 'Created Using Rynn UI',
  };
}

// ====================== NOTIFICATION CACHE ======================
let notificationsCache = [];

function loadNotifications() {
  try {
    const raw = fs.readFileSync(NOTIF_PATH, 'utf8');
    notificationsCache = JSON.parse(raw);
    if (!Array.isArray(notificationsCache)) notificationsCache = [];
  } catch {
    notificationsCache = [];
  }
}

function saveNotifications() {
  try {
    fs.writeFileSync(NOTIF_PATH, JSON.stringify(notificationsCache, null, 2));
  } catch (err) {
    log.error(`Failed to save notifications: ${err.message}`);
  }
}

loadNotifications();

// ====================== JSON RESPONSE WRAPPER ======================
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return originalJson.call(this, {
        ...data,
        creator: data.creator ?? settings.operator ?? 'Created Using Rynn UI',
      });
    }
    return originalJson.call(this, data);
  };
  next();
});

// ====================== STATIC FILES ======================
app.use('/', express.static(WEB_DIR));

// ====================== API MODULE LOADER ======================
let totalRoutes = 0;
const apiModules = [];

const loadModules = (dir) => {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      loadModules(filePath);
      return;
    }

    if (!stat.isFile() || path.extname(file) !== '.js') return;

    const apiName = path.basename(file, '.js');

    try {
      const module = require(filePath);

      if (!module.meta || !module.onStart || typeof module.onStart !== 'function') {
        log.warn(`Invalid module: ${filePath} (missing meta or onStart)`);
        return;
      }

      const rawPath = module.meta.path.split('?')[0];
      const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      const routePath = `/api${normalizedPath}`;

      const rawMethods = module.meta.method || 'get';
      const methods = (Array.isArray(rawMethods) ? rawMethods : [rawMethods])
        .map((m) => String(m).toLowerCase());

      const handler = async (req, res, next) => {
        try {
          log.handle(`Handling ${req.method} → ${routePath}`);
          await module.onStart({ req, res });
        } catch (error) {
          next(error);
        }
      };

      methods.forEach((method) => app[method](routePath, handler));

      apiModules.push({
        name: apiName,
        description: module.meta.description || module.meta.desc || '',
        category: module.meta.category,
        path:
          routePath +
          (module.meta.path.includes('?')
            ? `?${module.meta.path.split('?')[1]}`
            : ''),
        author: module.meta.author,
        method: rawMethods,
      });

      totalRoutes++;
      log.load(`Loaded: ${apiName} (${methods.map((m) => m.toUpperCase()).join(' | ')})`);
    } catch (error) {
      log.error(`Error loading ${filePath}: ${error.message}`);
    }
  });
};

loadModules(API_DIR);

log.success('Load Complete!');
log.success(`Total Routes Loaded: ${totalRoutes}`);

// ====================== BUILT-IN ROUTES ======================

// Serve public settings — strip sensitive fields and normalize icon path
app.get('/settings.json', (req, res) => {
  const { key: _key, ...publicSettings } = settings;
  if (publicSettings.icon && !publicSettings.icon.startsWith('/')) {
    publicSettings.icon = '/' + publicSettings.icon;
  }
  res.json(publicSettings);
});

app.get('/api/info', (req, res) => {
  const categoriesMap = {};
  apiModules.forEach((module) => {
    if (!categoriesMap[module.category]) {
      categoriesMap[module.category] = { name: module.category, items: [] };
    }
    categoriesMap[module.category].items.push({
      name: module.name,
      description: module.description,
      path: module.path,
      author: module.author,
      method: module.method,
    });
  });
  const categories = Object.values(categoriesMap);
  res.json({ categories, endpoints: categories, count: apiModules.length });
});

// Notification routes
app.get('/set', (req, res) => {
  const { key: _key, ...publicSettings } = settings;
  res.json({
    status: true,
    ...publicSettings,
    notification: notificationsCache,
  });
});

app.get('/notifications', (req, res) => {
  res.json({ notifications: notificationsCache });
});

app.post('/api/notification', async (req, res) => {
  const apiKey = process.env.API_KEY || settings.key;

  if (req.headers.authorization !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { message, clear, firstName } = req.body;

  if (clear) {
    notificationsCache = [];
    saveNotifications();
    return res.json({ success: true, cleared: true });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const newNotif = {
    id: Date.now(),
    title: `From Developer ${firstName || ''}`.trim(),
    message: message.trim(),
    createdAt: Date.now(),
  };

  notificationsCache.push(newNotif);
  saveNotifications();

  res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(WEB_DIR, 'gate.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(WEB_DIR, 'docs.html')));

// ====================== ERROR HANDLERS ======================
app.use((req, res) => {
  log.warn(`404: ${req.url}`);
  res.status(404).sendFile(path.join(ERR_DIR, '404.html'));
});

app.use((err, req, res, next) => {
  log.error(`Server Error: ${err.stack}`);
  res.status(500).sendFile(path.join(ERR_DIR, '500.html'));
});

// ====================== START SERVER ======================
app.listen(PORT, '0.0.0.0', () => {
  log.success(`Server running on port ${PORT}`);
});

module.exports = app;