require('dotenv').config();
const express = require('express');
const { Client } = require('pg');

const app = express();
const cors = require('cors');
// Add this right after creating the app:
app.use(cors());
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

app.get('/health', async (req, res) => {
    const healthStatus = {
        server: 'up',
        database: 'unknown'
    };

    // 1. Check if the environment variable is configured
    if (!DATABASE_URL) {
        healthStatus.database = 'unconfigured (DATABASE_URL missing)';
        return res.status(500).json(healthStatus);
    }

    // 2. Initialize a new Postgres client
    const client = new Client({
        connectionString: DATABASE_URL,
    });

    try {
        // 3. Attempt to connect, execute a simple query, and close the connection
        await client.connect();
        await client.query('SELECT 1');
        await client.end();

        healthStatus.database = 'connected';
        return res.status(200).json(healthStatus);

    } catch (error) {
        // If connection fails, return a 503 Service Unavailable with the error
        healthStatus.database = 'disconnected';
        healthStatus.error_details = error.message;
        
        // Ensure client is closed even if it failed during query
        try { await client.end(); } catch (e) {}

        return res.status(503).json(healthStatus);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});