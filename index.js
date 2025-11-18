const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Load users from JSON file
const usersFile = path.join(__dirname, 'users.json');
let users = {};
if(fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
}

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(users[username] && users[username] === password) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Invalid username or password" });
  }
});

// Sign-up route
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if(users[username]) {
    res.json({ success: false, message: "Username already exists" });
  } else {
    users[username] = password;
    fs.writeFileSync(usersFile, JSON.stringify(users));
    res.json({ success: true });
  }
});

// Serve static files
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
