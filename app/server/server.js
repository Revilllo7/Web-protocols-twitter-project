const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Middleware
app.use(express.json());

// Posts test
let posts = [
    { id: 1, title: "First Post", content: "This is the first post.", timeStamp: "4 hours" },
    { id: 2, title: "Second Post", content: "This is the second post.", timeStamp: "3 hours" },
];

// Get all posts
app.get("/api/posts", (_, res) => res.json(posts));

// Serve index.html for the root route
app.get("/", (_, res) => {
    res.sendFile(path.join(__dirname, "../client/public/index.html"));
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
