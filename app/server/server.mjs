import express from "express";
import https from "https";
import cors from "cors";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";
import bcrypt from "bcrypt";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { Filter } from "bad-words";
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
const ROOMS_FILE = path.join(__dirname, "rooms.json");
const COMMENTS_FILE = path.join(__dirname, "comments.json");

const corsOptions = {
    origin: "http://localhost:5500", // Make sure this matches your frontend URL exactly
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
    console.log(`${req.method} request to ${req.url}`);
    next();
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5500"); // Adjust to match frontend URL
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true"); // Allow cookies/auth headers
    next();
});

app.options("*", (req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5500"); // Adjust to match frontend URL
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    res.sendStatus(204); // No content response
});

app.use(express.json());

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" })
    ]
});

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send("Something broke!");
});

const fileExists = async (filePath) => {
    try {
        await fsPromises.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
};

const initFiles = async () => {
    if (!await fileExists(USERS_FILE)) {
        await fsPromises.writeFile(USERS_FILE, "[]");
    }
    if (!await fileExists(POSTS_FILE)) {
        await fsPromises.writeFile(POSTS_FILE, "[]");
    }
    if (!await fileExists(ROOMS_FILE)) {
        await fsPromises.writeFile(ROOMS_FILE, "{}");
    }
    if (!await fileExists(COMMENTS_FILE)) {
        await fsPromises.writeFile(COMMENTS_FILE, "{}");
    }
};

initFiles();

const readUsers = async () => {
    try {
        const data = await fsPromises.readFile(USERS_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

async function writeUsers(users) {
    try {
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Error writing to users file:", error);
        throw error;
    }
}

async function writePosts(posts) {
    try {
        await fsPromises.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
    } catch (err) {
        console.error("Error writing to posts file:", err);
        throw err;
    }
}

async function readPosts() {
    try {
        const data = await fsPromises.readFile(POSTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading posts file:", err);
        throw err;
    }
}

async function readRooms() {
    try {
        const data = await fsPromises.readFile(ROOMS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

async function writeRooms(rooms) {
    try {
        await fsPromises.writeFile(ROOMS_FILE, JSON.stringify(rooms, null, 2));
    } catch (err) {
        console.error("Error writing to rooms file:", err);
        throw err;
    }
}

async function readComments() {
    try {
        const data = await fsPromises.readFile(COMMENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading comments file:", err);
        return {};
    }
}

async function writeComments(comments) {
    try {
        await fsPromises.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2));
    } catch (err) {
        console.error("Error writing to comments file:", err);
        throw err;
    }
}

app.post('/register', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username, password, and role are required.' });
    }

    fs.readFile('users.json', 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            return res.status(500).json({ message: 'Error reading users file.' });
        }

        let users = [];
        if (!err) {
            try {
                users = JSON.parse(data);
            } catch (parseErr) {
                return res.status(500).json({ message: 'Error parsing users file.' });
            }
        }

        if (users.some(user => user.username === username)) {
            return res.status(400).json({ message: 'Username already exists.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = { username, password: hashedPassword, role };

        users.push(newUser);

        fs.writeFile('users.json', JSON.stringify(users, null, 2), err => {
            if (err) {
                return res.status(500).json({ message: 'Error saving user.' });
            }
            res.status(201).json({ message: 'User registered successfully.' });
        });
    });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Login failed. Username and password are required." });

    const users = await readUsers();
    const user = users.find(user => user.username === username);
    
    if (!user) {
        console.log("Invalid username attempt:", username);
        return res.status(401).json({ success: false, message: "Invalid username" });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);  
    if (!passwordMatch) {
        console.log("Wrong password attempt for user:", username);
        return res.status(401).json({ success: false, message: "Wrong password" });
    }

    console.log("User logged in successfully:", username);
    res.json({ success: true, message: "Login successful", role: user.role });
});

app.post("/posts/:id/comments", async (req, res) => {
    const postId = req.params.id;
    const { user, content } = req.body;

    if (!user || !content) {
        return res.status(400).json({ message: "User and content are required" });
    }

    try {
        const comments = await readComments();
        const newComment = {
            id: uuidv4(),
            user,
            content,
            timestamp: new Date().toISOString(),
        };

        comments[postId] = comments[postId] || [];
        comments[postId].push(newComment);

        await writeComments(comments);
        res.status(201).json(newComment);
    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ message: "Server error while adding comment" });
    }
});

app.get("/posts/:id/comments", async (req, res) => {
    const postId = req.params.id;
    try {
        const comments = await readComments();
        res.json(comments[postId] || []);
    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ message: "Server error while fetching comments" });
    }
});

app.put("/posts/:postId/comments/:commentId", async (req, res) => {
    const { postId, commentId } = req.params;
    const { content } = req.body;

    try {
        const comments = await readComments();
        const postComments = comments[postId] || [];
        const comment = postComments.find(c => c.id === commentId);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        comment.content = content;
        comment.timestamp = new Date().toISOString();

        await writeComments(comments);
        res.status(200).json(comment);
    } catch (err) {
        console.error("Error updating comment:", err);
        res.status(500).json({ message: "Server error while updating comment" });
    }
});

app.delete("/posts/:postId/comments/:commentId", async (req, res) => {
    const { postId, commentId } = req.params;

    try {
        const comments = await readComments();
        comments[postId] = comments[postId].filter(c => c.id !== commentId);

        await writeComments(comments);
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (err) {
        console.error("Error deleting comment:", err);
        res.status(500).json({ message: "Server error while deleting comment" });
    }
});

const wss = new WebSocketServer({ port: 3001 });

wss.on("connection", (ws) => {
    console.log('New client connected');

    ws.on('message', async (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            const { room, message: msg } = parsedMessage;

            console.log(`Received message: ${msg} in room: ${room}`);

            const cleanMessage = filter.clean(msg);

            const rooms = await readRooms();

            if (!rooms[room]) {
                rooms[room] = [];
            }
            rooms[room].push(cleanMessage);

            await writeRooms(rooms);

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

const server = https.createServer(options, app);
server.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});

app.get("/posts", async (req, res) => {
    try {
        const posts = await readPosts();
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: "Error loading posts" });
    }
});

app.get("/posts/:id", async (req, res) => {
    const postId = req.params.id;
    const posts = await readPosts();

    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json(post);
});

app.post("/posts", async (req, res) => {
    const { user, content, hashtags } = req.body;
    if (!user || !content) {
        return res.status(400).json({ message: "User and content are required" });
    }

    const cleanContent = filter.clean(content);

    const posts = await readPosts();

    let newPost = {
        id: uuidv4(),
        user,
        content: cleanContent,
        hashtags,
        timestamp: new Date().toISOString(),
        edited: false
    };

    posts.push(newPost);

    await fsPromises.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));

    res.status(201).json(newPost);
});

app.put("/posts/:id", async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const posts = await readPosts();

    const post = posts.find(p => p.id === postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const username = req.body.username;
    if (post.user !== username && username !== "admin") {
        return res.status(403).json({ message: "You are not authorized to edit this post" });
    }

    const cleanContent = filter.clean(content);

    post.content = cleanContent;
    post.edited = true;
    post.timestamp = new Date().toISOString();

    await fsPromises.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.status(200).json(post);
});

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
        await writePosts(updatedPosts);

        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error during post deletion:", error);
        res.status(500).json({ message: "Server error occurred while deleting post" });
    }
});

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

app.use(express.static(path.join(__dirname, "client/public")));