const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (index.html, dashboard.html, etc.)
app.use(express.static(path.join(__dirname)));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set - set it in Render environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connect error:', err);
    process.exit(1);
  });

// User schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Test route
app.get('/ping', (req, res) => res.json({ ok: true }));

// SIGNUP
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Missing username or password' });

    const doc = new User({ username, passwordHash: password });
    await doc.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('signup error', err);
    if (err.code === 11000) return res.json({ success: false, message: 'Username already exists' });
    return res.json({ success: false, message: 'Server error' });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.passwordHash !== password) return res.json({ success: false, message: 'Invalid credentials' });
    return res.json({ success: true });
  } catch (err) {
    console.error('login error', err);
    return res.json({ success: false, message: 'Server error' });
  }
});

// Catch-all to serve index.html for the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
