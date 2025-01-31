import express from "express";
import https from "https";
import cors from "cors";
import path from "path";
import { promises as fs } from "fs";
import bcrypt from "bcrypt";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import Filter from "bad-words";
import { fileURLToPath } from "url";
import winston from "winston";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const filter = new Filter();
const PORT = 3000;

const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, "users.json");
const POSTS_FILE = path.join(__dirname, "posts.json");
const ROOMS_FILE = path.join(__dirname, "rooms.json");  // Added rooms.json for saving messages

const corsOptions = {
    origin: "http://localhost:5500", // Allow requests from the frontend (port 5500)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow these HTTP methods
    allowedHeaders: ["Content-Type"], // Allow Content-Type header
};

app.use(cors(corsOptions)); // Apply CORS middleware with these options

// Middleware
app.use(express.json());

// Initialize the logger
const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" })
    ]
});

// Log all requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Log errors
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send("Something broke!");
});

// Check if the users.json and rooms.json files exist, if not, create them
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
    if (!await fileExists(ROOMS_FILE)) {
        await fs.writeFile(ROOMS_FILE, "{}"); // Create an empty object if missing
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
async function readPosts() {
    try {
        const data = await fs.readFile(POSTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading posts file:", err);
        throw err;
    }
}

// Function to read messages from rooms.json
async function readRooms() {
    try {
        const data = await fs.readFile(ROOMS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};  // Return empty object if no rooms are found
    }
}

// Function to write messages to rooms.json
async function writeRooms(rooms) {
    try {
        await fs.writeFile(ROOMS_FILE, JSON.stringify(rooms, null, 2));
    } catch (err) {
        console.error("Error writing to rooms file:", err);
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

// WebSocket server
const wss = new WebSocketServer({ port: 3001 });

// WebSocket connection handling
wss.on("connection", (ws) => {
    console.log('New client connected');

    ws.on('message', async (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            const { room, message: msg } = parsedMessage;

            console.log(`Received message: ${msg} in room: ${room}`);

            // Filter the message for profanity
            const cleanMessage = filter.clean(msg);

            // Read the current rooms data
            const rooms = await readRooms();

            // Add the message to the appropriate room
            if (!rooms[room]) {
                rooms[room] = [];
            }
            rooms[room].push(cleanMessage);

            // Save the updated rooms data
            await writeRooms(rooms);

            // Broadcast the message to all clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ room, message: cleanMessage }));
                }
            });
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('User disconnected from WebSocket.');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

console.log('WebSocket server is running on ws://localhost:3001');

// WebSocket upgrade handling for HTTP server
const server = https.createServer(options, app);
server.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
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

    // Filter the content for profanity
    const cleanContent = filter.clean(content);

    // Get the current posts from the posts file
    const posts = await readPosts();

    // Generate a new unique post ID
    let newPost = {
        id: uuidv4(),
        user,
        content: cleanContent,
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

    // Filter the content for profanity
    const cleanContent = filter.clean(content);

    post.content = cleanContent;
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

// GET /rooms/:id - Fetch messages for a specific room
app.get("/rooms/:id", async (req, res) => {
    const roomId = req.params.id;
    try {
        const rooms = await readRooms();
        const messages = rooms[roomId] || [];
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: "Error loading messages" });
    }
});

// COMMENTS



// Serve static files
app.use(express.static(path.join(__dirname, "client/public")));