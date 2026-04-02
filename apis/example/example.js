const meta = {
  name: "Example",
  desc: "A simple example API that demonstrates basic functionality",
  method: "get",
  category: "example",
  path: "/example?text="
};

async function onStart({ res, req }) {
  const { text } = req.query;
  if (!text) throw Object.assign(new Error('Text parameter is required'), { status: 400 });

  res.json({
    status: true,
    original: text,
    reversed: text.split('').reverse().join(''),
    length: text.length,
  });
}

module.exports = { meta, onStart };
