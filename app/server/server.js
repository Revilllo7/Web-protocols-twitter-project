const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, "users.json");

// Enable CORS
app.use(cors());


// Middleware
app.use(express.json());

// Read users from file
const readUsers = async () => {
    try {
        const data = await fs.readFile(USERS_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Write users to file
const writeUsers = async (users) => {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
};

// Register endpoint
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Registration failed" });

    const users = await readUsers();
    const userExists = users.some(user => user.username === username); // Compare plaintext
    if (userExists) return res.status(400).json({ message: "User already exists" });

    users.push({ username, password }); // Store plaintext username, hashed password
    await writeUsers(users);

    res.json({ message: "User registered successfully" });
});

// Login endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Login failed" });

    const users = await readUsers();
    const user = users.find(user => user.username === username); // Compare plaintext usernames
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid username" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ success: false, message: "Wrong password" });
    }

    res.json({ success: true, message: "Login successful" });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
