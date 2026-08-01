const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { existsSync, mkdirSync } = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Storage Configuration
const VERSION = '1.0.2';
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

const getProfileFile = (filePath, profile) => {
    if (profile === '2') {
        return filePath.replace(/\.json$/, '_vester.json');
    }
    return filePath;
};

// --- MongoDB Configuration ---
let mongoose;
let isMongoConnected = false;
let getEnvelopeModels;

try {
    mongoose = require('mongoose');
    const MONGO_URI = "mongodb+srv://mathan:mathanpassword123@cluster0.234hb7j.mongodb.net/mat_suite?retryWrites=true&w=majority&appName=Cluster0";

    mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            console.log('✅ Connected to MongoDB Atlas (Cloud Database Integration)');
            isMongoConnected = true;
        })
        .catch(err => {
            console.error('⚠️ MongoDB Connection Error. Falling back to local JSON files:', err.message);
        });

    // --- Schemas & Models ---
    const EnvelopeSenderSchema = new mongoose.Schema({ id: Number, name: String, address: String, phone: String }, { strict: false });
    const EnvelopeSender = mongoose.model('EnvelopeSender', EnvelopeSenderSchema);

    const EnvelopeCategorySchema = new mongoose.Schema({ name: String });
    const EnvelopeCategory = mongoose.model('EnvelopeCategory', EnvelopeCategorySchema);

    const EnvelopeAddressSchema = new mongoose.Schema({ id: String, name: String, address: String, city: String, phone: String, category: String }, { strict: false });
    const EnvelopeAddress = mongoose.model('EnvelopeAddress', EnvelopeAddressSchema);

    const EnvelopeSettingsSchema = new mongoose.Schema({ data: String });
    const EnvelopeSettings = mongoose.model('EnvelopeSettings', EnvelopeSettingsSchema);

    const EnvelopeRecycleSchema = new mongoose.Schema({ id: String, name: String, address: String, city: String, phone: String, category: String, deletedAt: String }, { strict: false });
    const EnvelopeRecycle = mongoose.model('EnvelopeRecycle', EnvelopeRecycleSchema);

    // Envelope Models (VESTER - Profile 2)
    const EnvelopeSender2 = mongoose.model('EnvelopeSender2', EnvelopeSenderSchema);
    const EnvelopeCategory2 = mongoose.model('EnvelopeCategory2', EnvelopeCategorySchema);
    const EnvelopeAddress2 = mongoose.model('EnvelopeAddress2', EnvelopeAddressSchema);
    const EnvelopeSettings2 = mongoose.model('EnvelopeSettings2', EnvelopeSettingsSchema);
    const EnvelopeRecycle2 = mongoose.model('EnvelopeRecycle2', EnvelopeRecycleSchema);

    getEnvelopeModels = (profile) => {
        if (profile === '2') {
            return { Sender: EnvelopeSender2, Category: EnvelopeCategory2, Address: EnvelopeAddress2, Settings: EnvelopeSettings2, Recycle: EnvelopeRecycle2 };
        }
        return { Sender: EnvelopeSender, Category: EnvelopeCategory, Address: EnvelopeAddress, Settings: EnvelopeSettings, Recycle: EnvelopeRecycle };
    };
} catch (e) {
    console.warn('⚠️ Mongoose dependency not installed. Using local JSON files storage.');
}

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
        storage: isMongoConnected ? 'MongoDB Atlas' : STORAGE_DIR,
        mode: isMongoConnected ? 'cloud' : 'local',
        time: new Date().toISOString()
    });
});

// Senders (FROM Profiles)
app.get(['/api/senders', '/api/envelope/senders'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Sender } = getEnvelopeModels(req.query.profile);
        try {
            const data = await Sender.find();
            return res.json(data);
        } catch (err) {
            console.error('Failed to read senders from MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(SENDERS_FILE, req.query.profile);
        if (!existsSync(file)) return res.json([]);
        const data = await fs.readFile(file, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read senders' });
    }
});

app.post(['/api/senders', '/api/envelope/senders'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Sender } = getEnvelopeModels(req.query.profile);
        try {
            await Sender.deleteMany({});
            await Sender.insertMany(req.body);
            return res.json({ success: true });
        } catch (err) {
            console.error('Failed to save senders in MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(SENDERS_FILE, req.query.profile);
        await fs.writeFile(file, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save senders' });
    }
});

// Categories
app.get(['/api/categories', '/api/envelope/categories'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Category } = getEnvelopeModels(req.query.profile);
        try {
            const data = await Category.find();
            return res.json(data.map(c => c.name));
        } catch (err) {
            console.error('Failed to read categories from MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(CATEGORIES_FILE, req.query.profile);
        if (!existsSync(file)) return res.json([]); // Empty by default
        const data = await fs.readFile(file, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read categories' });
    }
});

app.post(['/api/categories', '/api/envelope/categories'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Category } = getEnvelopeModels(req.query.profile);
        try {
            await Category.deleteMany({});
            await Category.insertMany(req.body.map(name => ({ name })));
            return res.json({ success: true });
        } catch (err) {
            console.error('Failed to save categories in MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(CATEGORIES_FILE, req.query.profile);
        await fs.writeFile(file, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save categories' });
    }
});

// Addresses
app.get(['/api/addresses', '/api/envelope/addresses'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Address } = getEnvelopeModels(req.query.profile);
        try {
            const data = await Address.find();
            return res.json(data);
        } catch (err) {
            console.error('Failed to read addresses from MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(DATA_FILE, req.query.profile);
        if (!existsSync(file)) return res.json([]);
        const data = await fs.readFile(file, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.post(['/api/addresses', '/api/envelope/addresses'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Address } = getEnvelopeModels(req.query.profile);
        try {
            await Address.deleteMany({});
            await Address.insertMany(req.body);
            return res.json({ success: true });
        } catch (err) {
            console.error('Failed to save addresses in MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(DATA_FILE, req.query.profile);
        await fs.writeFile(file, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.get(['/api/recycle', '/api/envelope/recycle'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Recycle } = getEnvelopeModels(req.query.profile);
        try {
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
            try {
                await Recycle.deleteMany({ deletedAt: { $lt: fifteenDaysAgo.toISOString() } });
            } catch (err) {
                console.error('Failed to clean up old recycled entries in MongoDB:', err.message);
            }
            const data = await Recycle.find();
            return res.json(data);
        } catch (err) {
            console.error('Failed to read recycle entries from MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(RECYCLE_FILE, req.query.profile);
        const { existsSync } = require('fs');
        if (!existsSync(file)) return res.json([]);
        const data = await fs.readFile(file, 'utf8');
        let recycled = JSON.parse(data);
        
        // Auto-cleanup: Filter out entries older than 15 days
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        
        const filtered = recycled.filter(item => {
            if (!item.deletedAt) return true;
            return new Date(item.deletedAt) >= fifteenDaysAgo;
        });

        if (filtered.length !== recycled.length) {
            fs.writeFile(file, JSON.stringify(filtered, null, 2)).catch(err => {
                console.error('Failed to clean up old recycled entries on disk:', err);
            });
        }
        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read recycle data' });
    }
});

app.post(['/api/recycle', '/api/envelope/recycle'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Recycle } = getEnvelopeModels(req.query.profile);
        try {
            await Recycle.deleteMany({});
            await Recycle.insertMany(req.body);
            return res.json({ success: true });
        } catch (err) {
            console.error('Failed to save recycle data in MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(RECYCLE_FILE, req.query.profile);
        await fs.writeFile(file, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save recycle data' });
    }
});

// Settings
app.get(['/api/settings', '/api/envelope/settings'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Settings } = getEnvelopeModels(req.query.profile);
        try {
            const doc = await Settings.findOne();
            return res.json(doc ? JSON.parse(doc.data) : {});
        } catch (err) {
            console.error('Failed to read settings from MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(SETTINGS_FILE, req.query.profile);
        if (!existsSync(file)) return res.json({});
        const data = await fs.readFile(file, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

app.post(['/api/settings', '/api/envelope/settings'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Settings } = getEnvelopeModels(req.query.profile);
        try {
            await Settings.deleteMany({});
            await Settings.create({ data: JSON.stringify(req.body) });
            return res.json({ success: true });
        } catch (err) {
            console.error('Failed to save settings in MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(SETTINGS_FILE, req.query.profile);
        await fs.writeFile(file, JSON.stringify(req.body, null, 2));
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
    console.log(`📂 Storage: ${isMongoConnected ? 'MongoDB Atlas' : STORAGE_DIR}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        process.exit(0);
    } else {
        const timestamp = new Date().toLocaleString();
        require('fs').appendFileSync(path.join(__dirname, 'startup_log.txt'), `\n[${timestamp}] ❌ Server failed: ${err.message}\n`);
        process.exit(1);
    }
});
