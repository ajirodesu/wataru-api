# Wataru API

A lightweight, self-hosted API documentation platform built with **Express.js**. Drop a module file into the `api/` folder and it appears instantly on the documentation site — no config files, no rebuilds.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Adding API Modules](#adding-api-modules)
  - [Module Structure](#module-structure)
  - [Meta Fields](#meta-fields)
  - [GET API with Query Parameters](#get-api-with-query-parameters)
  - [POST API with Body](#post-api-with-body)
  - [Binary Response (Image, Audio, File)](#binary-response-image-audio-file)
- [Built-in Endpoints](#built-in-endpoints)
- [Notification System](#notification-system)
- [Dependencies](#dependencies)

---

## Project Structure

```
.
├── api/                      # Your API modules go here
│   ├── example/
│   │   └── example.js
│   └── random/
│       └── bluearchive.js
├── core/
│   ├── app.js                # Express server
│   └── web/
│       ├── gate.html         # Landing page
│       ├── docs.html         # API documentation page
│       └── err/
│           ├── 404.html
│           └── 500.html
├── json/
│   ├── settings.json         # Site configuration
│   └── notif.json            # Stored notifications
├── index.js                  # Entry point
└── package.json
```

---

## Getting Started

**Install dependencies:**

```bash
npm install
```

**Start the server:**

```bash
npm start
```

The server starts on port **5000** by default. Open `http://localhost:5000` to see the landing page and `http://localhost:5000/docs` for the API documentation.

---

## Configuration

All site settings live in `json/settings.json`.

```json
{
  "name": "Wataru APIs",
  "description": "Simple and easy to use",
  "key": "your-secret-key",
  "header": {
    "status": "Online!",
    "imageSrc": ["https://your-image-url.gif"],
    "imageSize": {
      "mobile": "80%",
      "tablet": "40%",
      "desktop": "40%"
    }
  },
  "icon": "image/icon.png",
  "operator": "YourName",
  "telegram": "https://t.me/your-channel",
  "messenger": "https://m.me/your-link",
  "github": "https://github.com/your-username"
}
```

| Field | Description |
|---|---|
| `name` | Site title shown on all pages |
| `description` | Short tagline shown on the landing page and docs hero |
| `key` | Secret key used to authorize the notification API — **never shared with users** |
| `header.status` | Status badge text (e.g. `"Online!"`) |
| `header.imageSrc` | Array of image/GIF URLs; the first one is used as the hero image |
| `header.imageSize` | Responsive width of the hero image per breakpoint |
| `icon` | Path to the favicon (relative to the `web/` folder) |
| `operator` | Your name or handle — shown in the docs terminal prompt |
| `telegram` | Full URL to your Telegram channel or group |
| `messenger` | Full URL to your Messenger link |
| `github` | Full URL to your GitHub profile or repo |

> The `key` field is stripped server-side before any settings data reaches the browser.

---

## Adding API Modules

Each API is a single `.js` file placed anywhere inside the `api/` folder. Subfolders are supported — the loader scans recursively.

```
api/
├── tools/
│   └── myTool.js       → registered as /api/mytool
└── images/
    └── anime.js        → registered as /api/<path from meta>
```

The server auto-loads every valid module on startup. No registration step required.

---

### Module Structure

Every module must export two things:

```js
module.exports = { meta, onStart };
```

- **`meta`** — an object describing the API (used by the documentation UI)
- **`onStart`** — an `async function({ req, res })` that handles the request

---

### Meta Fields

```js
const meta = {
  name: "myapi",               // Display name in the docs sidebar
  description: "Does something useful", // Description shown in the docs
  author: "YourName",          // Optional — shown on the API card
  method: "get",               // HTTP method: "get", "post", "put", "delete"
  category: "tools",           // Category grouping in the sidebar
  path: "/myapi?query="        // Route path — query string defines parameters
};
```

| Field | Required | Description |
|---|---|---|
| `name` | No | Display name. Falls back to the filename if omitted |
| `description` | No | Short description shown in the UI |
| `author` | No | Credit shown on the API card |
| `method` | No | HTTP method, defaults to `"get"` |
| `category` | Yes | Groups APIs together in the sidebar |
| `path` | Yes | URL path. Everything after `?` defines the parameter list |

**Defining parameters via `path`:**

The query string in `meta.path` tells the docs UI which input fields to render.

```
"/search?query=hello&limit=10"
```

This creates two input fields: `query` (prefilled with `hello`) and `limit` (prefilled with `10`).

---

### GET API with Query Parameters

```js
// api/tools/reverse.js

const meta = {
  name: "reverse",
  description: "Reverses any text",
  method: "get",
  category: "tools",
  path: "/reverse?text=hello"
};

async function onStart({ req, res }) {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ status: false, error: "text is required" });
  }

  return res.json({
    status: true,
    result: text.split("").reverse().join("")
  });
}

module.exports = { meta, onStart };
```

**Request:**
```
GET /api/reverse?text=hello
```

**Response:**
```json
{
  "status": true,
  "result": "olleh",
  "creator": "YourName"
}
```

> Every JSON response automatically gets a `creator` field injected from `settings.json`.

---

### POST API with Body

Set `method: "post"` in meta. The docs UI will show a JSON body editor instead of query fields.

```js
// api/tools/login.js

const meta = {
  name: "login",
  description: "Validates user credentials",
  method: "post",
  category: "auth",
  path: "/login?username=&password="
};

async function onStart({ req, res }) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ status: false, error: "Missing credentials" });
  }

  // Your validation logic here
  const valid = username === "admin" && password === "secret";

  return res.json({
    status: valid,
    message: valid ? "Login successful" : "Invalid credentials"
  });
}

module.exports = { meta, onStart };
```

**Request:**
```
POST /api/login
Content-Type: application/json

{ "username": "admin", "password": "secret" }
```

---

### Binary Response (Image, Audio, File)

For binary data, write the response manually using `res.writeHead` and `res.end`. The docs UI auto-detects `image/*`, `video/*`, and `audio/*` content types and renders a preview.

```js
// api/images/cat.js

const axios = require("axios");

const meta = {
  name: "cat",
  description: "Returns a random cat image",
  author: "YourName",
  method: "get",
  category: "images",
  path: "/cat"
};

async function onStart({ req, res }) {
  try {
    const { data } = await axios.get("https://api.thecatapi.com/v1/images/search");
    const imageUrl = data[0].url;
    const image = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(image.data);

    res.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Content-Length": buffer.length
    });
    res.end(buffer);
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
}

module.exports = { meta, onStart };
```

---

## Built-in Endpoints

These are provided by the server automatically and used by the frontend.

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Landing page |
| `/docs` | GET | API documentation page |
| `/settings.json` | GET | Public site config (key is stripped) |
| `/api/info` | GET | All loaded API modules in JSON |
| `/notifications` | GET | Current notifications list |
| `/set` | GET | Full settings + notifications combined |
| `/api/notification` | POST | Add or clear a notification (requires key) |

---

## Notification System

You can push notifications to the docs page bell icon from any HTTP client.

**Add a notification:**

```bash
curl -X POST https://your-site.com/api/notification \
  -H "Content-Type: application/json" \
  -H "Authorization: your-secret-key" \
  -d '{ "message": "New APIs added!", "firstName": "Dev" }'
```

| Body Field | Required | Description |
|---|---|---|
| `message` | Yes | The notification body text |
| `firstName` | No | Sender name, shown in the notification title |
| `clear` | No | Set to `true` to delete all notifications |

**Clear all notifications:**

```bash
curl -X POST https://your-site.com/api/notification \
  -H "Content-Type: application/json" \
  -H "Authorization: your-secret-key" \
  -d '{ "clear": true }'
```

Notifications are saved to `json/notif.json` and persist across restarts. The docs page polls for new notifications every 6 seconds and shows unread badges automatically.

---

## Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `axios` | HTTP requests inside API modules |
| `cors` | Cross-origin request headers |
| `chalk` | Colored console output |
| `body-parser` | Request body parsing |
| `node-fetch` | Fetch API for Node.js |
| `cheerio` | HTML parsing (available for scraper modules) |
