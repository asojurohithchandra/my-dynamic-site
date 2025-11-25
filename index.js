// index.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ---------- Local file fallback setup ----------
const usersFile = path.join(__dirname, 'users.json');
let fileUsers = {};
if (fs.existsSync(usersFile)) {
  try {
    fileUsers = JSON.parse(fs.readFileSync(usersFile));
  } catch (err) {
    console.error('Failed to read users.json:', err);
    fileUsers = {};
  }
}

// ---------- MongoDB (Mongoose) setup ----------
const MONGODB_URI = process.env.MONGODB_URI || '';

let User = null;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.warn('Falling back to local users.json storage.');
    });

  const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  });

  // Avoid model overwrite issues in some environments (hot reloads)
  try {
    User = mongoose.model('User');
  } catch (e) {
    User = mongoose.model('User', userSchema);
  }
} else {
  console.warn('MONGODB_URI not set — using local users.json for storage.');
}

// ---------- Helper utilities ----------
async function saveFileUsers() {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(fileUsers, null, 2));
  } catch (err) {
    console.error('Failed to write users.json:', err);
  }
}

// ---------- Routes ----------

// Sign-up route
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Missing username or password' });

  try {
    if (User) {
      // Mongo path
      const existing = await User.findOne({ username }).exec();
      if (existing) return res.status(409).json({ success: false, message: 'Username already exists' });

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const user = new User({ username, passwordHash });
      await user.save();
      return res.status(201).json({ success: true });
    } else {
      // File fallback
      if (fileUsers[username]) {
        return res.status(409).json({ success: false, message: 'Username already exists (local)' });
      }
      // Note: storing plain password in local file only for quick dev; do NOT do this in production.
      fileUsers[username] = password;
      await saveFileUsers();
      return res.status(201).json({ success: true, message: 'User saved locally' });
    }
  } catch (err) {
    console.error('Signup error:', err);
    // handle duplicate key error if it slipped through
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Missing username or password' });

  try {
    if (User) {
      const user = await User.findOne({ username }).exec();
      if (!user) return res.json({ success: false, message: 'Invalid username or password' });

      const ok = await bcrypt.compare(password, user.passwordHash);
      return res.json({ success: ok });
    } else {
      // File fallback (plain-text compare)
      if (fileUsers[username] && fileUsers[username] === password) {
        return res.json({ success: true });
      } else {
        return res.json({ success: false, message: 'Invalid username or password' });
      }
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Keep serving static files (your frontend)
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
