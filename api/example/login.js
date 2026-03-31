// api/tools/login.js

const meta = {
  name: "login",
  description: "Validates user credentials",
  method: "post",
  category: "example",
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