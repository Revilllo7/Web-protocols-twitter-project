const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const bcrypt = require("bcrypt");
const uuidv4 = require("uuid").v4;

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, "users.json");
const POSTS_FILE = path.join(__dirname, "posts.json");

const corsOptions = {
    origin: "http://localhost:5500", // Allow requests from the frontend (port 5500)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow these HTTP methods
    allowedHeaders: ["Content-Type"], // Allow Content-Type header
};

app.use(cors(corsOptions)); // Apply CORS middleware with these options

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

// Read posts from file
const readPosts = async () => {
    try {
        const data = await fs.readFile(POSTS_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Get posts (for displaying them), sorted by timestamp (newest first)
app.get("/posts", async (_, res) => {
    const posts = await readPosts();
    
    // Sort posts by timestamp in descending order
    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(posts);
});

// POST endpoint to add new posts
app.post("/posts", async (req, res) => {
    const { user, content, hashtags } = req.body;
    if (!user || !content) {
        return res.status(400).json({ message: "User and content are required" });
    }

    // Get the current posts from the posts file
    const posts = await readPosts();

    // Generate a new unique post ID
    let newPost = {
        id: uuidv4(),
        user,
        content,
        hashtags,
        timestamp: new Date().toISOString(),
        edited: false
    };

    posts.push(newPost);

    // Write the updated posts to the file
    await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));

    res.status(201).json(newPost);
});

// PUT endpoint to update an existing post

// DELETE endpoint to remove a post
app.delete("/posts/:id", async (req, res) => {
    const postId = req.params.id;
    const posts = await readPosts();

    const updatedPosts = posts.filter(post => post.id !== postId);
    if (posts.length === updatedPosts.length) {
        return res.status(404).json({ message: "Post not found" });
    }

    await fs.writeFile(POSTS_FILE, JSON.stringify(updatedPosts, null, 2));

    res.status(200).json({ message: "Post deleted successfully" });
});

// Serve static files
app.use(express.static(path.join(__dirname, "client/public")));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
