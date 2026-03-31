require('dotenv').config();

const http = require('http');
const app = require('./app');
const sequelize = require('./models/db');

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const requiredEnvVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'];

if (IS_PRODUCTION) {
    requiredEnvVars.push('CORS_ORIGIN');
}

const missingEnvVars = requiredEnvVars.filter((name) => {
    const value = process.env[name];
    return !value || String(value).trim() === '';
});

if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const server = http.createServer(app);

// Verify database connection before starting server
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connection verified.');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
    } else if (error.code === 'EACCES') {
        console.error(`Insufficient privileges to bind to port ${PORT}.`);
    } else {
        console.error('Server failed to start:', error.message);
    }
    process.exit(1);
});

let shuttingDown = false;

function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    console.log(`Received ${signal}. Shutting down gracefully...`);

    server.close((error) => {
        if (error) {
            console.error('Error while closing server:', error.message);
            process.exit(1);
        }

        console.log('HTTP server closed. Shutdown complete.');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
