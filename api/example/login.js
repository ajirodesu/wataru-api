const meta = {
  name: "login",
  description: "Validates user credentials",
  method: "post",
  category: "example",
  path: "/login?username=&password="
};

async function onStart({ req, res }) {
  const { username, password } = req.body;
  if (!username || !password) throw Object.assign(new Error('Missing credentials'), { status: 400 });

  const valid = username === "admin" && password === "secret";
  res.json({ status: valid, message: valid ? "Login successful" : "Invalid credentials" });
}

module.exports = { meta, onStart };
