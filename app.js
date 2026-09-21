const express = require('express');
const cors = require('cors');
const path = require('path');

const resourcesRouter = require('./routes/resources');
const requestsRouter = require('./routes/requests');
const availabilityRouter = require('./routes/availability');
const allocateRouter = require('./routes/allocate');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the simple frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/resources', resourcesRouter);
app.use('/requests', requestsRouter);
app.use('/availability', availabilityRouter);
app.use('/allocate', allocateRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

module.exports = app;
