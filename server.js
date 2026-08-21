const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { existsSync, mkdirSync } = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '2.1.0 (Cloud Unified)';

// Storage Configuration
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

// Envelope Files
const DATA_FILE = path.join(STORAGE_DIR, 'addresses.json');
const RECYCLE_FILE = path.join(STORAGE_DIR, 'recycle_bin.json');
const SETTINGS_FILE = path.join(STORAGE_DIR, 'settings.json');
const SENDERS_FILE = path.join(STORAGE_DIR, 'senders.json');
const CATEGORIES_FILE = path.join(STORAGE_DIR, 'categories.json');

// Stock Files
const STOCK_DATA_FILE = path.join(STORAGE_DIR, 'stock_products.json');
const STOCK_RECYCLE_FILE = path.join(STORAGE_DIR, 'stock_recycles.json');
const STOCK_SETTINGS_FILE = path.join(STORAGE_DIR, 'stock_settings.json');
const STOCK_USERS_FILE = path.join(STORAGE_DIR, 'stock_users.json');
const STOCK_TRANSACTIONS_FILE = path.join(STORAGE_DIR, 'stock_transactions.json');

const getProfileFile = (filePath, profile) => {
    if (profile === '2') {
        if (filePath.includes('stock')) {
            return filePath.replace(/\.json$/, '_fitvee.json');
        }
        return filePath.replace(/\.json$/, '_vester.json');
    }
    return filePath;
};

// --- MongoDB Configuration ---
let mongoose;
let isMongoConnected = false;
let getEnvelopeModels;
let getStockModels;

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

    // --- Envelope Schemas & Models ---
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

    // --- Stock Schemas & Models ---
    const StockProductSchema = new mongoose.Schema({ id: String, data: String });
    const StockProduct = mongoose.model('StockProduct', StockProductSchema, 'stockproducts');

    const StockTransactionSchema = new mongoose.Schema({ id: String, data: String });
    const StockTransaction = mongoose.model('StockTransaction', StockTransactionSchema, 'stocktransactions');

    const StockRecycleSchema = new mongoose.Schema({ id: String, data: String });
    const StockRecycle = mongoose.model('StockRecycle', StockRecycleSchema, 'stockrecycles');

    const StockUserSchema = new mongoose.Schema({ username: { type: String, unique: true }, password: String });
    const StockUser = mongoose.model('StockUser', StockUserSchema, 'stockusers');

    const StockSettingsSchema = new mongoose.Schema({ id: { type: Number, unique: true, default: 1 }, data: String });
    const StockSettings = mongoose.model('StockSettings', StockSettingsSchema, 'stocksettings');

    // Stock Models (FITVEE - Profile 2)
    const StockProduct2 = mongoose.model('StockProduct2', StockProductSchema, 'stockproducts2');
    const StockTransaction2 = mongoose.model('StockTransaction2', StockTransactionSchema, 'stocktransactions2');
    const StockRecycle2 = mongoose.model('StockRecycle2', StockRecycleSchema, 'stockrecycles2');
    const StockUser2 = mongoose.model('StockUser2', StockUserSchema, 'stockusers2');
    const StockSettings2 = mongoose.model('StockSettings2', StockSettingsSchema, 'stocksettings2');

    getStockModels = (profile) => {
        if (profile === '2') {
            return { Product: StockProduct2, Transaction: StockTransaction2, Recycle: StockRecycle2, User: StockUser2, Settings: StockSettings2 };
        }
        return { Product: StockProduct, Transaction: StockTransaction, Recycle: StockRecycle, User: StockUser, Settings: StockSettings };
    };

} catch (e) {
    console.warn('⚠️ Mongoose dependency not installed. Using local JSON files storage.');
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Serve static files dynamically based on base path
const BASE_DIR = __dirname.endsWith('envelope') ? path.join(__dirname, '..', '..') : __dirname;
app.use('/', express.static(path.join(BASE_DIR, 'dashboard')));
app.use('/envelope', express.static(path.join(BASE_DIR, 'apps', 'envelope')));
app.use('/stock', express.static(path.join(BASE_DIR, 'apps', 'stock')));

// --- Security Middlewares (Hardening against Hackers/Scanners) ---

// 1. HTTP Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data:; img-src 'self' data: https:;");
    
    // Disable caching for all API responses to ensure real-time settings sync
    if (req.url.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// 2. NoSQL Injection Prevention
function sanitizeNoSql(obj) {
    if (obj && typeof obj === 'object') {
        for (const key in obj) {
            if (key.startsWith('$')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                sanitizeNoSql(obj[key]);
            }
        }
    }
}
app.use((req, res, next) => {
    sanitizeNoSql(req.query);
    sanitizeNoSql(req.body);
    next();
});

// 3. Strict Profile Input Validation
app.use((req, res, next) => {
    if (req.query && req.query.profile) {
        if (req.query.profile !== '1' && req.query.profile !== '2') {
            req.query.profile = '1'; // Force safe fallback
        }
    }
    next();
});

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

// --- Envelope APIs ---

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
        if (!existsSync(file)) return res.json([]); 
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

// Recycle Bin
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

app.post(['/api/recycle/add', '/api/envelope/recycle/add'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Recycle } = getEnvelopeModels(req.query.profile);
        try {
            const newItem = new Recycle(req.body);
            await newItem.save();
            return res.json({ success: true });
        } catch (err) {
            console.error('Failed to add to recycle in MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(RECYCLE_FILE, req.query.profile);
        const { existsSync } = require('fs');
        let recycled = [];
        if (existsSync(file)) {
            const fileData = await fs.readFile(file, 'utf8');
            recycled = JSON.parse(fileData);
        }
        recycled.push(req.body);
        await fs.writeFile(file, JSON.stringify(recycled, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add to recycle bin' });
    }
});

// Envelope Settings
app.get(['/api/settings', '/api/envelope/settings'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Settings } = getEnvelopeModels(req.query.profile);
        try {
            const doc = await Settings.findOne();
            let data = doc ? JSON.parse(doc.data) : {};
            if (req.query.lightweight === 'true') {
                const { letterPadData, ...lightData } = data;
                return res.json(lightData);
            }
            return res.json(data);
        } catch (err) {
            console.error('Failed to read settings from MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(SETTINGS_FILE, req.query.profile);
        if (!existsSync(file)) return res.json({});
        const fileData = await fs.readFile(file, 'utf8');
        let data = JSON.parse(fileData);
        if (req.query.lightweight === 'true') {
            const { letterPadData, ...lightData } = data;
            return res.json(lightData);
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

app.post(['/api/settings', '/api/envelope/settings'], async (req, res) => {
    if (isMongoConnected && getEnvelopeModels) {
        const { Settings } = getEnvelopeModels(req.query.profile);
        try {
            const doc = await Settings.findOne();
            let existing = doc ? JSON.parse(doc.data) : {};
            
            const merged = { ...existing, ...req.body };
            if (existing.letterPadData && (!req.body.letterPadData || Object.keys(req.body.letterPadData).length === 0)) {
                merged.letterPadData = existing.letterPadData;
            }
            
            await Settings.deleteMany({});
            await Settings.create({ data: JSON.stringify(merged) });
            return res.json({ success: true });
        } catch (err) {
            console.error('Failed to save settings in MongoDB, falling back to disk:', err.message);
        }
    }
    try {
        const file = getProfileFile(SETTINGS_FILE, req.query.profile);
        const { existsSync } = require('fs');
        let existing = {};
        if (existsSync(file)) {
            const fileData = await fs.readFile(file, 'utf8');
            existing = JSON.parse(fileData);
        }
        
        const merged = { ...existing, ...req.body };
        if (existing.letterPadData && (!req.body.letterPadData || Object.keys(req.body.letterPadData).length === 0)) {
            merged.letterPadData = existing.letterPadData;
        }
        
        await fs.writeFile(file, JSON.stringify(merged, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});


// --- Stock APIs ---

app.post('/api/stock/login', async (req, res) => {
    const { username, password } = req.body;
    if (isMongoConnected && getStockModels) {
        const { User } = getStockModels(req.query.profile);
        try {
            const user = await User.findOne({ username, password });
            if (user) {
                res.json({ success: true, username: user.username });
            } else {
                // Seed default admin if collection is empty
                const count = await User.countDocuments();
                if (count === 0 && username === 'admin' && password === 'zoro') {
                    await User.create({ username: 'admin', password: 'zoro' });
                    return res.json({ success: true, username: 'admin' });
                }
                res.status(401).json({ error: 'Invalid username or password' });
            }
        } catch (err) {
            console.error('Failed to login in MongoDB:', err.message);
            res.status(500).json({ error: 'DB error' });
        }
    } else {
        // Local fallback authentication
        try {
            const file = getProfileFile(STOCK_USERS_FILE, req.query.profile);
            let users = [];
            if (existsSync(file)) {
                users = JSON.parse(await fs.readFile(file, 'utf8'));
            }
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                res.json({ success: true, username: user.username });
            } else if (users.length === 0 && username === 'admin' && password === 'zoro') {
                // Save default admin
                const defaultUsers = [{ username: 'admin', password: 'zoro' }];
                await fs.writeFile(file, JSON.stringify(defaultUsers, null, 2));
                res.json({ success: true, username: 'admin' });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Failed to authenticate' });
        }
    }
});

app.get('/api/stock/data', async (req, res) => {
    if (isMongoConnected && getStockModels) {
        const { Settings, Product, Transaction, User, Recycle } = getStockModels(req.query.profile);
        try {
            const [settingsDoc, products, transactions, users, recycleBin] = await Promise.all([
                Settings.findOne({ id: 1 }),
                Product.find(),
                Transaction.find(),
                User.find(),
                Recycle.find()
            ]);
            return res.json({
                settings: settingsDoc ? JSON.parse(settingsDoc.data) : { categories: [], defMin: 5 },
                products: products.map(p => JSON.parse(p.data)),
                transactions: transactions.map(t => JSON.parse(t.data)),
                users: users.map(u => ({ username: u.username, password: u.password })),
                recycleBin: recycleBin.map(r => JSON.parse(r.data))
            });
        } catch (err) {
            console.error('Failed to read stock data from MongoDB, falling back to disk:', err.message);
        }
    }
    // Local fallback
    try {
        const setFile = getProfileFile(STOCK_SETTINGS_FILE, req.query.profile);
        const prodFile = getProfileFile(STOCK_DATA_FILE, req.query.profile);
        const txFile = getProfileFile(STOCK_TRANSACTIONS_FILE, req.query.profile);
        const usrFile = getProfileFile(STOCK_USERS_FILE, req.query.profile);
        const recFile = getProfileFile(STOCK_RECYCLE_FILE, req.query.profile);

        const [setData, prodData, txData, usrData, recData] = await Promise.all([
            existsSync(setFile) ? fs.readFile(setFile, 'utf8') : Promise.resolve(null),
            existsSync(prodFile) ? fs.readFile(prodFile, 'utf8') : Promise.resolve(null),
            existsSync(txFile) ? fs.readFile(txFile, 'utf8') : Promise.resolve(null),
            existsSync(usrFile) ? fs.readFile(usrFile, 'utf8') : Promise.resolve(null),
            existsSync(recFile) ? fs.readFile(recFile, 'utf8') : Promise.resolve(null)
        ]);

        res.json({
            settings: setData ? JSON.parse(setData) : { categories: [], defMin: 5 },
            products: prodData ? JSON.parse(prodData) : [],
            transactions: txData ? JSON.parse(txData) : [],
            users: usrData ? JSON.parse(usrData) : [],
            recycleBin: recData ? JSON.parse(recData) : []
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read stock data from disk' });
    }
});

app.post('/api/stock/data', (req, res) => {
    const { settings, products, transactions, users, recycleBin } = req.body;
    res.json({ success: true });
    
    (async () => {
        if (isMongoConnected && getStockModels) {
            const { Settings, Product, Transaction, User, Recycle } = getStockModels(req.query.profile);
            try {
                if (settings) await Settings.findOneAndUpdate({ id: 1 }, { data: JSON.stringify(settings) }, { upsert: true });
                if (products) {
                    await Product.deleteMany({});
                    await Product.insertMany(products.map(p => ({ id: p.id, data: JSON.stringify(p) })));
                }
                if (transactions) {
                    await Transaction.deleteMany({});
                    await Transaction.insertMany(transactions.map(t => ({ id: t.id, data: JSON.stringify(t) })));
                }
                if (users) {
                    await User.deleteMany({});
                    await User.insertMany(users);
                }
                if (recycleBin) {
                    await Recycle.deleteMany({});
                    await Recycle.insertMany(recycleBin.map(r => ({ id: r.id || String(Date.now() + Math.random()), data: JSON.stringify(r) })));
                }
                return;
            } catch (err) {
                console.error('Failed to save stock data in MongoDB, falling back to disk:', err.message);
            }
        }
        // Local fallback
        try {
            const setFile = getProfileFile(STOCK_SETTINGS_FILE, req.query.profile);
            const prodFile = getProfileFile(STOCK_DATA_FILE, req.query.profile);
            const txFile = getProfileFile(STOCK_TRANSACTIONS_FILE, req.query.profile);
            const usrFile = getProfileFile(STOCK_USERS_FILE, req.query.profile);
            const recFile = getProfileFile(STOCK_RECYCLE_FILE, req.query.profile);

            if (settings) await fs.writeFile(setFile, JSON.stringify(settings, null, 2));
            if (products) await fs.writeFile(prodFile, JSON.stringify(products, null, 2));
            if (transactions) await fs.writeFile(txFile, JSON.stringify(transactions, null, 2));
            if (users) await fs.writeFile(usrFile, JSON.stringify(users, null, 2));
            if (recycleBin) await fs.writeFile(recFile, JSON.stringify(recycleBin, null, 2));
        } catch (err) {
            console.error('Failed to save stock data on disk:', err.message);
        }
    })();
});

app.get('/api/server-info', (req, res) => {
    res.json({ mode: isMongoConnected ? 'cloud' : 'local', version: VERSION });
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
    console.log(`✅ Cloud Unified Server running at http://localhost:${PORT}`);
    console.log(`📂 Storage: ${isMongoConnected ? 'MongoDB Atlas' : STORAGE_DIR}`);
    
    // Keep-alive for free tier (prevents Render container from sleeping)
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || 'https://mat-suite-cloud-v3.onrender.com';
    if (RENDER_URL) {
        setInterval(() => {
            const https = require('https');
            const http = require('http');
            const client = RENDER_URL.startsWith('https') ? https : http;
            
            client.get(RENDER_URL + '/api/server-info', (res) => {
                console.log(`[Keep-Alive] Ping successful! Status: ${res.statusCode}`);
            }).on('error', (err) => {
                console.error('[Keep-Alive] Ping failed:', err.message);
            });
        }, 13 * 60 * 1000); // 13 minutes (Render sleeps after 15 minutes of inactivity)
    }
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        process.exit(0);
    } else {
        const timestamp = new Date().toLocaleString();
        require('fs').appendFileSync(path.join(__dirname, 'startup_log.txt'), `\n[${timestamp}] ❌ Server failed: ${err.message}\n`);
        process.exit(1);
    }
});
