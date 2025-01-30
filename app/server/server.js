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

// Check if the users.json file exists, if not, create it
const fileExists = async (filePath) => {
    try {
        await fs.access(filePath); // Check if the file exists
        return true;
    } catch (error) {
        return false; // File does not exist
    }
};

const initFiles = async () => {
    if (!await fileExists(USERS_FILE)) {
        await fs.writeFile(USERS_FILE, "[]"); // Create an empty JSON array if missing
    }
    if (!await fileExists(POSTS_FILE)) {
        await fs.writeFile(POSTS_FILE, "[]"); // Create an empty JSON array if missing
    }
};

initFiles(); // Initialize files if needed

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
async function writeUsers(users) {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Error writing to users file:", error);
        throw error;
    }
}

// Function to write updated posts to the posts.json file
async function writePosts(posts) {
    try {
        await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
    } catch (err) {
        console.error("Error writing to posts file:", err);
        throw err;
    }
}

// Function to read posts from the posts.json file
// Function to read posts from the posts.json file
async function readPosts() {
    try {
        const data = await fs.readFile(POSTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading posts file:", err);
        throw err;
    }
}

// Register endpoint
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        console.log("Missing username or password");
        return res.status(400).json({ message: "Username and password are required." });
    }

    const users = await readUsers(); // Ensure you're reading users asynchronously
    const existingUser = users.find(user => user.username === username);  // Check if the user already exists

    if (existingUser) {
        console.log("Username already taken:", username);
        return res.status(409).json({ message: "Username already exists." });
    }

    // Hash the password with bcrypt
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { username, password: hashedPassword, role: 'user' };
        users.push(newUser);

        await writeUsers(users);  // Ensure you're writing users back to the file
        console.log("New user registered:", username);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error hashing password or saving user:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Login endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Login failed. Username and password are required." });

    const users = await readUsers();  // Ensure you're reading users asynchronously
    const user = users.find(user => user.username === username);  // Compare usernames
    
    if (!user) {
        console.log("Invalid username attempt:", username);
        return res.status(401).json({ success: false, message: "Invalid username" });
    }
    
    // Ensure bcrypt is correctly comparing the password
    const passwordMatch = await bcrypt.compare(password, user.password);  
    if (!passwordMatch) {
        console.log("Wrong password attempt for user:", username);
        return res.status(401).json({ success: false, message: "Wrong password" });
    }

    console.log("User logged in successfully:", username);
    res.json({ success: true, message: "Login successful", role: user.role });
});



// GET /posts - Fetch all posts
app.get("/posts", async (req, res) => {
    try {
        const posts = await readPosts();
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sorting posts by timestamp
        res.json(posts); // Return all posts
    } catch (err) {
        res.status(500).json({ message: "Error loading posts" });
    }
});

// GET /posts/:id - Fetch a specific post by ID
app.get("/posts/:id", async (req, res) => {
    const postId = req.params.id;
    const posts = await readPosts();

    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json(post); // Return the post if found
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
app.put("/posts/:id", async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const posts = await readPosts();

    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the logged-in user is the post author or an admin
    const username = req.body.username; // Assume you send the username in the request body
    if (post.user !== username && username !== "admin") {
        return res.status(403).json({ message: "You are not authorized to edit this post" });
    }

    post.content = content;
    post.edited = true;
    post.timestamp = new Date().toISOString();

    await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.status(200).json(post);
});

// DELETE endpoint to remove a post
app.delete("/posts/:id", async (req, res) => {
    const postId = req.params.id;
    const { username, role } = req.body;

    try {
        const posts = await readPosts();
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (role !== "admin" && post.user !== username) {
            return res.status(403).json({ message: "You are not authorized to delete this post" });
        }

        const updatedPosts = posts.filter(p => p.id !== postId);
        await writePosts(updatedPosts); // This writes the updated posts back to the file

        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error during post deletion:", error);
        res.status(500).json({ message: "Server error occurred while deleting post" });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, "client/public")));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
