const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Resource Scheduler API running at http://localhost:${PORT}`);
  console.log(`Frontend served at http://localhost:${PORT}/index.html`);
});
