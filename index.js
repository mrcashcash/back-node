require('dotenv').config();
const express = require('express');
const { Client } = require('pg');

const app = express();
const cors = require('cors');
app.use(cors());

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_URL = process.env.DATABASE_URL;

async function buildHealthStatus() {
    const status = {
        server: 'up',
        database: 'unknown',
        status: 'ok',
    };

    if (!DATABASE_URL) {
        status.database = 'unconfigured';
        status.status = 'degraded';
        status.details = 'DATABASE_URL is missing';
        return status;
    }

    const client = new Client({ connectionString: DATABASE_URL });
    try {
        await client.connect();
        await client.query('SELECT 1');
        status.database = 'connected';
        return status;
    } catch (error) {
        status.database = 'disconnected';
        status.status = 'degraded';
        status.error_details = error.message;
        return status;
    } finally {
        try { await client.end(); } catch (_) {}
    }
}

// Liveness: 200 as long as the process can answer. Degraded dependencies do
// not fail liveness — that's what /ready is for.
app.get('/health', async (_req, res) => {
    res.status(200).json(await buildHealthStatus());
});

// Version: static build metadata. Safe to cache; does not touch the DB.
app.get('/version', (_req, res) => {
    res.status(200).json({Version: 'V2'});
});

// Readiness: 200 only when the DB is reachable, 503 otherwise. This is the
// endpoint an orchestrator should gate traffic on.
app.get('/ready', async (_req, res) => {
    const status = await buildHealthStatus();
    res.status(status.database === 'connected' ? 200 : 503).json(status);
});

app.listen(PORT, HOST, () => {
    console.log(`Server listening on ${HOST}:${PORT}`);
});
