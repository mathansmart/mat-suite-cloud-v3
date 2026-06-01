const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { existsSync, mkdirSync } = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Storage Configuration
const VERSION = '1.0.1';
const PRIMARY_STORAGE = 'D:\\Desktop\\PRINTER';
const LOCAL_STORAGE = path.join(__dirname, 'data');
let STORAGE_DIR = PRIMARY_STORAGE;

// Initialize Storage Directory with logic-based fallback
function initStorage() {
    const timestamp = new Date().toLocaleString();
    console.log(`\n--- Startup Attempt: ${timestamp} ---`);
    try {
        if (!existsSync(STORAGE_DIR)) {
            mkdirSync(STORAGE_DIR, { recursive: true });
            console.log(`✅ Primary storage created: ${STORAGE_DIR}`);
        } else {
            // Test if we can actually write to it
            const testFile = path.join(STORAGE_DIR, '.test_write');
            require('fs').writeFileSync(testFile, 'test');
            require('fs').unlinkSync(testFile);
            console.log(`✅ Primary storage ready: ${STORAGE_DIR}`);
        }
    } catch (err) {
        console.warn(`⚠️ Primary storage inaccessible (${PRIMARY_STORAGE}). Falling back to local 'data' folder.`);
        console.error(`Error: ${err.message}`);
        STORAGE_DIR = LOCAL_STORAGE;
        if (!existsSync(STORAGE_DIR)) {
            mkdirSync(STORAGE_DIR, { recursive: true });
        }
    }
}

initStorage();

const DATA_FILE = path.join(STORAGE_DIR, 'addresses.json');
const RECYCLE_FILE = path.join(STORAGE_DIR, 'recycle_bin.json');
const SETTINGS_FILE = path.join(STORAGE_DIR, 'settings.json');
const SENDERS_FILE = path.join(STORAGE_DIR, 'senders.json');
const CATEGORIES_FILE = path.join(STORAGE_DIR, 'categories.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname)); // Serve the frontend from current directory

// --- API Endpoints ---

// Check Status
app.get(['/api/status', '/api/envelope/status'], (req, res) => {
    res.json({ 
        status: 'online', 
        version: VERSION,
        storage: STORAGE_DIR,
        time: new Date().toISOString()
    });
});

// Senders (FROM Profiles)
app.get(['/api/senders', '/api/envelope/senders'], async (req, res) => {
    try {
        if (!existsSync(SENDERS_FILE)) return res.json([]);
        const data = await fs.readFile(SENDERS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read senders' });
    }
});

app.post(['/api/senders', '/api/envelope/senders'], async (req, res) => {
    try {
        await fs.writeFile(SENDERS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save senders' });
    }
});

// Categories
app.get(['/api/categories', '/api/envelope/categories'], async (req, res) => {
    try {
        if (!existsSync(CATEGORIES_FILE)) return res.json([]); // Empty by default
        const data = await fs.readFile(CATEGORIES_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read categories' });
    }
});

app.post(['/api/categories', '/api/envelope/categories'], async (req, res) => {
    try {
        await fs.writeFile(CATEGORIES_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save categories' });
    }
});

// Addresses
app.get(['/api/addresses', '/api/envelope/addresses'], async (req, res) => {
    try {
        if (!existsSync(DATA_FILE)) return res.json([]);
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.post(['/api/addresses', '/api/envelope/addresses'], async (req, res) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.get(['/api/recycle', '/api/envelope/recycle'], async (req, res) => {
    try {
        const { existsSync } = require('fs');
        if (!existsSync(RECYCLE_FILE)) return res.json([]);
        const data = await fs.readFile(RECYCLE_FILE, 'utf8');
        let recycled = JSON.parse(data);
        
        // Auto-cleanup: Filter out entries older than 15 days
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        
        const filtered = recycled.filter(item => {
            if (!item.deletedAt) return true;
            return new Date(item.deletedAt) >= fifteenDaysAgo;
        });

        if (filtered.length !== recycled.length) {
            fs.writeFile(RECYCLE_FILE, JSON.stringify(filtered, null, 2)).catch(err => {
                console.error('Failed to clean up old recycled entries on disk:', err);
            });
        }
        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read recycle data' });
    }
});

app.post(['/api/recycle', '/api/envelope/recycle'], async (req, res) => {
    try {
        await fs.writeFile(RECYCLE_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save recycle data' });
    }
});

// Settings
app.get(['/api/settings', '/api/envelope/settings'], async (req, res) => {
    try {
        if (!existsSync(SETTINGS_FILE)) return res.json({});
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

app.post(['/api/settings', '/api/envelope/settings'], async (req, res) => {
    try {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Error Handling for Stability
process.on('uncaughtException', (err) => {
    const timestamp = new Date().toLocaleString();
    const logErr = `\n[${timestamp}] ! CRITICAL ERROR ! \n${err.stack}\n`;
    require('fs').appendFileSync(path.join(__dirname, 'startup_log.txt'), logErr);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    const timestamp = new Date().toLocaleString();
    const logErr = `\n[${timestamp}] ! UNHANDLED REJECTION ! \nReason: ${reason}\n`;
    require('fs').appendFileSync(path.join(__dirname, 'startup_log.txt'), logErr);
});

// Start Server with Instance Check
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Envelope Pro Server running at http://localhost:${PORT}`);
    console.log(`📂 Storage: ${STORAGE_DIR}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        process.exit(0);
    } else {
        const timestamp = new Date().toLocaleString();
        require('fs').appendFileSync(path.join(__dirname, 'startup_log.txt'), `\n[${timestamp}] ❌ Server failed: ${err.message}\n`);
        process.exit(1);
    }
});
