const meta = {
  name: "login",
  version: "1.0.0",
  description: "Login API endpoint",
  author: "AjiroDesu", 
  method: "post",
  category: "example",
  path: "/login?username=&password=" // Removed query params since this is a POST endpoint and credentials should be in the body
};

async function onStart({ res, req }) {
  try {
    const { username, password } = req.body;

    // Check for required fields
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Simple authentication logic for demonstration.
    if (username === 'test' && password === 'test') {
      res.status(200).json({ 
        success: true, 
        message: 'Login successful', 
        token: 'lance123' 
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

module.exports = { meta, onStart };