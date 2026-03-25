const meta = {
  name: "example",
  version: "1.0.0",
  description: "A simple example API that demonstrates basic functionality",
  method: "get",
  category: "example",
  path: "/example?text="
};

async function onStart({ res, req }) {
  // Extract the 'text' parameter from the query string
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ 
      status: false, 
      error: 'Text parameter is required' 
    });
  }

  // Process the text (in this example, we'll just reverse it)
  const reversed = text.split('').reverse().join('');

  // Return a JSON response
  return res.json({
    original: text,
    reversed: reversed,
    length: text.length,
    timestamp: new Date().toISOString(),
    powered_by: "Wataru API"
  });
}

module.exports = { meta, onStart };