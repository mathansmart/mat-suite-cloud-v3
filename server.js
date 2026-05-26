const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;
const VERSION = '2.1.0 (Cloud Unified)';

// --- MongoDB Configuration ---
const MONGO_URI = "mongodb+srv://mathan:mathanpassword123@cluster0.234hb7j.mongodb.net/mat_suite?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB Atlas (Cloud)'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Schemas & Models ---

// Envelope Models (MILTON - Profile 1)
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

const getEnvelopeModels = (profile) => {
    if (profile === '2') {
        return { Sender: EnvelopeSender2, Category: EnvelopeCategory2, Address: EnvelopeAddress2, Settings: EnvelopeSettings2, Recycle: EnvelopeRecycle2 };
    }
    return { Sender: EnvelopeSender, Category: EnvelopeCategory, Address: EnvelopeAddress, Settings: EnvelopeSettings, Recycle: EnvelopeRecycle };
};

// Stock Models
const StockProductSchema = new mongoose.Schema({ id: String, data: String });
const StockProduct = mongoose.model('StockProduct', StockProductSchema);

const StockTransactionSchema = new mongoose.Schema({ id: String, data: String });
const StockTransaction = mongoose.model('StockTransaction', StockTransactionSchema);

const StockRecycleSchema = new mongoose.Schema({ id: String, data: String });
const StockRecycle = mongoose.model('StockRecycle', StockRecycleSchema);

const StockUserSchema = new mongoose.Schema({ username: { type: String, unique: true }, password: String });
const StockUser = mongoose.model('StockUser', StockUserSchema);

const StockSettingsSchema = new mongoose.Schema({ id: { type: Number, unique: true, default: 1 }, data: String });
const StockSettings = mongoose.model('StockSettings', StockSettingsSchema);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Static Servings ---
app.use('/', express.static(path.join(__dirname, 'dashboard')));
app.use('/envelope', express.static(path.join(__dirname, 'apps/envelope')));
app.use('/stock', express.static(path.join(__dirname, 'apps/stock')));

// --- Envelope APIs ---
app.get('/api/envelope/status', (req, res) => {
    res.json({ status: 'online', version: VERSION, mode: 'cloud' });
});

app.get('/api/envelope/senders', async (req, res) => {
    const { Sender } = getEnvelopeModels(req.query.profile);
    try { res.json(await Sender.find()); } catch (err) { res.status(500).json([]); }
});

app.post('/api/envelope/senders', (req, res) => {
    const { Sender } = getEnvelopeModels(req.query.profile);
    res.json({ success: true });
    (async () => {
        try {
            await Sender.deleteMany({});
            await Sender.insertMany(req.body);
        } catch (err) { console.error('Failed to save senders in background:', err); }
    })();
});

app.get('/api/envelope/categories', async (req, res) => {
    const { Category } = getEnvelopeModels(req.query.profile);
    try {
        const data = await Category.find();
        res.json(data.map(c => c.name));
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/envelope/categories', (req, res) => {
    const { Category } = getEnvelopeModels(req.query.profile);
    res.json({ success: true });
    (async () => {
        try {
            await Category.deleteMany({});
            await Category.insertMany(req.body.map(name => ({ name })));
        } catch (err) { console.error('Failed to save categories in background:', err); }
    })();
});

app.get('/api/envelope/addresses', async (req, res) => {
    const { Address } = getEnvelopeModels(req.query.profile);
    try { res.json(await Address.find()); } catch (err) { res.status(500).json([]); }
});

app.post('/api/envelope/addresses', (req, res) => {
    const { Address } = getEnvelopeModels(req.query.profile);
    res.json({ success: true });
    (async () => {
        try {
            await Address.deleteMany({});
            await Address.insertMany(req.body);
        } catch (err) { console.error('Failed to save addresses in background:', err); }
    })();
});

app.get('/api/envelope/recycle', async (req, res) => {
    const { Recycle } = getEnvelopeModels(req.query.profile);
    try {
        // Auto-cleanup: Delete items older than 15 days
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        try {
            await Recycle.deleteMany({ deletedAt: { $lt: fifteenDaysAgo.toISOString() } });
        } catch (err) {
            console.error('Failed to clean up old recycled entries:', err);
        }
        res.json(await Recycle.find());
    } catch (err) {
        res.status(500).json([]);
    }
});

app.post('/api/envelope/recycle', (req, res) => {
    const { Recycle } = getEnvelopeModels(req.query.profile);
    res.json({ success: true });
    (async () => {
        try {
            await Recycle.deleteMany({});
            await Recycle.insertMany(req.body);
        } catch (err) { console.error('Failed to save recycled addresses in background:', err); }
    })();
});

app.get('/api/envelope/settings', async (req, res) => {
    const { Settings } = getEnvelopeModels(req.query.profile);
    try {
        const doc = await Settings.findOne();
        res.json(doc ? JSON.parse(doc.data) : {});
    } catch (err) { res.status(500).json({}); }
});

app.post('/api/envelope/settings', (req, res) => {
    const { Settings } = getEnvelopeModels(req.query.profile);
    res.json({ success: true });
    (async () => {
        try {
            await Settings.deleteMany({});
            await Settings.create({ data: JSON.stringify(req.body) });
        } catch (err) { console.error('Failed to save settings in background:', err); }
    })();
});

// --- Stock APIs ---
app.post('/api/stock/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await StockUser.findOne({ username, password });
        if (user) res.json({ success: true, username: user.username });
        else {
            // Default admin if none exists
            const count = await StockUser.countDocuments();
            if (count === 0 && username === 'admin' && password === 'zoro') {
                await StockUser.create({ username: 'admin', password: 'zoro' });
                return res.json({ success: true, username: 'admin' });
            }
            res.status(401).json({ error: 'Invalid' });
        }
    } catch (err) { res.status(500).json({ error: 'DB error' }); }
});

app.get('/api/stock/data', async (req, res) => {
    try {
        const [settingsDoc, products, transactions, users, recycleBin] = await Promise.all([
            StockSettings.findOne({ id: 1 }),
            StockProduct.find(),
            StockTransaction.find(),
            StockUser.find(),
            StockRecycle.find()
        ]);
        res.json({
            settings: settingsDoc ? JSON.parse(settingsDoc.data) : { categories: [], defMin: 5 },
            products: products.map(p => JSON.parse(p.data)),
            transactions: transactions.map(t => JSON.parse(t.data)),
            users: users.map(u => ({ username: u.username, password: u.password })),
            recycleBin: recycleBin.map(r => JSON.parse(r.data))
        });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/stock/data', (req, res) => {
    const { settings, products, transactions, users, recycleBin } = req.body;
    res.json({ success: true });
    (async () => {
        try {
            if (settings) await StockSettings.findOneAndUpdate({ id: 1 }, { data: JSON.stringify(settings) }, { upsert: true });
            if (products) {
                await StockProduct.deleteMany({});
                await StockProduct.insertMany(products.map(p => ({ id: p.id, data: JSON.stringify(p) })));
            }
            if (transactions) {
                await StockTransaction.deleteMany({});
                await StockTransaction.insertMany(transactions.map(t => ({ id: t.id, data: JSON.stringify(t) })));
            }
            if (users) {
                await StockUser.deleteMany({});
                await StockUser.insertMany(users);
            }
            if (recycleBin) {
                await StockRecycle.deleteMany({});
                await StockRecycle.insertMany(recycleBin.map(r => ({ id: r.id || Date.now() + Math.random(), data: JSON.stringify(r) })));
            }
        } catch (err) { console.error('Failed to save stock data in background:', err); }
    })();
});

app.get('/api/server-info', (req, res) => {
    res.json({ mode: 'cloud', version: VERSION });
});

app.listen(PORT, () => {
    console.log(`✅ Cloud Unified Server running on port ${PORT}`);
});
