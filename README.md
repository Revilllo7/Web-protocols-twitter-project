Author: Oliver Gruba
Group: 4

---

# Evaluation Summary

## HTTP (6 pkt.)

1. **CRUD Operations**:
   - **CREATE**:
     - Register endpoint (`/register`) - 0.13 pkt.
       ```http
       POST /register
       {
         "username": "newUser",
         "password": "password123"
       }
       ```
     - Add post endpoint (`/posts`) - 0.13 pkt.
       ```http
       POST /posts
       {
         "user": "username",
         "content": "This is a new post",
         "hashtags": ["new", "post"]
       }
       ```
     - Add message endpoint (WebSocket) - 0.13 pkt.
       ```javascript
       socket.send(JSON.stringify({ room: "1", message: "Hello, Room 1!" }));
       ```
     - Total: 0.39 pkt.
   - **READ**:
     - Fetch all posts (`/posts`) - 0.13 pkt.
       ```http
       GET /posts
       ```
     - Fetch specific post by ID (`/posts/:id`) - 0.13 pkt.
       ```http
       GET /posts/1
       ```
     - Fetch messages for a specific room (`/rooms/:id`) - 0.13 pkt.
       ```http
       GET /rooms/1
       ```
     - Total: 0.39 pkt.
   - **UPDATE**:

     - Update post endpoint (`/posts/:id`) - 0.13 pkt.
       ```http
       PUT /posts/1
       {
         "content": "Updated content",
         "username": "username"
       }
       ```
     - Update user password (`/username/`) - 0.13 pkt.

       ```http
       app.put('/edit-password'
       ```

     - Total: 0.26 pkt.

   - **DELETE**:
     - Delete post endpoint (`/posts/:id`) - 0.13 pkt.
       ```http
       DELETE /posts/1
       {
         "username": "username",
         "role": "admin"
       }
       ```
     - Delete user account (`/users/:username`) - 0.13 pkt.
     ```http
       app.delete('/users/:username',
     ```
     - Total: 0.26 pkt.
2. **Search Functionality**:
   - Search posts by content and hashtags - 0.25 pkt.
     ```javascript
     const searchInput = document.getElementById("search-bar");
     searchInput.addEventListener("input", (e) => {
       const query = e.target.value.trim();
       loadPosts(null, query); // Reload posts based on search query
     });
     ```
   - Total: 0.25 pkt.
3. **Login Functionality**:
   - Login endpoint (`/login`) - 0.5 pkt.
     ```http
     POST /login
     {
       "username": "username",
       "password": "password123"
     }
     ```
   - Total: 0.5 pkt.
4. **Client to Handle Endpoints**:
   - Client-side code handles: - login - register - add post - edit post - delete post - fetch posts
     ... (117 lines left)
     Collapse
     message.txt
     6 KB

Author: Oliver Gruba
Group: Group 4

# Evaluation Summary

## HTTP (6 pkt.)

1. **CRUD Operations**:
   - **CREATE**:
     - Register endpoint (`/register`) - 0.13 pkt.
       ```http
       POST /register
       {
         "username": "newUser",
         "password": "password123"
       }
       ```
     - Add post endpoint (`/posts`) - 0.13 pkt.
       ```http
       POST /posts
       {
         "user": "username",
         "content": "This is a new post",
         "hashtags": ["new", "post"]
       }
       ```
     - Add message endpoint (WebSocket) - 0.13 pkt.
       ```javascript
       socket.send(JSON.stringify({ room: "1", message: "Hello, Room 1!" }));
       ```
     - Total: 0.39 pkt.
   - **READ**:
     - Fetch all posts (`/posts`) - 0.13 pkt.
       ```http
       GET /posts
       ```
     - Fetch specific post by ID (`/posts/:id`) - 0.13 pkt.
       ```http
       GET /posts/1
       ```
     - Fetch messages for a specific room (`/rooms/:id`) - 0.13 pkt.
       ```http
       GET /rooms/1
       ```
     - Total: 0.39 pkt.
   - **UPDATE**:
     - Update post endpoint (`/posts/:id`) - 0.13 pkt.
       ```http
       PUT /posts/1
       {
         "content": "Updated content",
         "username": "username"
       }
       ```
     - Total: 0.13 pkt.
   - **DELETE**:
     - Delete post endpoint (`/posts/:id`) - 0.13 pkt.
       ```http
       DELETE /posts/1
       {
         "username": "username",
         "role": "admin"
       }
       ```
     - Total: 0.13 pkt.
2. **Search Functionality**:
   - Search posts by content and hashtags - 0.25 pkt.
     ```javascript
     const searchInput = document.getElementById("search-bar");
     searchInput.addEventListener("input", (e) => {
       const query = e.target.value.trim();
       loadPosts(null, query); // Reload posts based on search query
     });
     ```
   - Total: 0.25 pkt.
3. **Login Functionality**:
   - Login endpoint (`/login`) - 0.5 pkt.
     ```http
     POST /login
     {
       "username": "username",
       "password": "password123"
     }
     ```
   - Total: 0.5 pkt.
4. **Client to Handle Endpoints**:
   - Client-side code handles:
     - login
     - register
     - add post
     - edit post
     - delete post
     - fetch posts
     - WebSocket messages.
   - Total: X pkt.
     **Total for HTTP**: 0.39 + 0.39 + 0.13 + 0.13 + 0.5 + 0.5 + 3 = 6 pkt.

## MQTT, WebSocket (6 pkt.)

1. **Backend WebSocket**:
   - WebSocket server setup and handling connections - X pkt.
     ```javascript
     const wss = new WebSocketServer({ port: 3001 });
     wss.on("connection", (ws) => {
       console.log("New client connected");
       ws.on("message", async (message) => {
         // Handle incoming messages
       });
     });
     ```
   - Handling messages and room switching - X pkt.
     ```javascript
     ws.on("message", async (message) => {
       const parsedMessage = JSON.parse(message);
       const { room, message: msg } = parsedMessage;
       // Handle message for the specific room
     });
     ```
   - Total: X pkt.
2. **Frontend WebSocket**:
   - Establishing WebSocket connection - X pkt.
     ```javascript
     const socket = new WebSocket("ws://localhost:3001");
     ```
   - Sending and receiving messages - X pkt.
     ```javascript
     socket.send(JSON.stringify({ room: "1", message: "Hello, Room 1!" }));
     socket.addEventListener("message", (event) => {
       const data = JSON.parse(event.data);
       displayMessage(data.room, data.message);
     });
     ```
   - Total: X pkt.
     **Total for MQTT, WebSocket**: 2 + 2 = 4 pkt.

## Other (6 pkt.)

1. **Cookies**:
   - Sensible use of cookies for login and role management - X pkt.
     ```javascript
     function setCookie(name, value, days = 7) {
       const expires = new Date();
       expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
       document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}; Secure; SameSite=Lax`;
     }
     ```
   - User roles and permissions (admin, user) - X pkt.
     ```javascript
     if (role !== "admin" && post.user !== username) {
       alert("You are not authorized to edit this post.");
       return;
     }
     ```
2. **TLS/SSL** - X pkt.
   -TLS: Transport Layer Security
   -SSL: Secure Sockets Layer
   ```javascript
   import https from "https";
   const server = https.createServer(options, app);
   server.listen(PORT, () => {
     console.log(`Server running on https://localhost:${PORT}`);
   });
   server.on("upgrade", (request, socket, head) => {
     wss.handleUpgrade(request, socket, head, (ws) => {
       wss.emit("connection", ws, request);
     });
   });
   ```
3. **Winston logging** - X pkt.

- logs all requests
- logs errors
  ```javascript
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: "error.log", level: "error" }),
      new winston.transports.File({ filename: "combined.log" }),
    ],
  });
  ```

4. **Profanity filter** - X pkt.

- kurwa? --> **\***?
  **Total for Inne**: X pkt.

## Aplikacja (2 pkt.)

1. **Execution and Complexity**:
   - The application is well-structured, with a clear separation of concerns between client and server.
   - Use of modern JavaScript features and libraries.
   - Application works without errors.
   - Total: X pkt.
     **Total for Aplikacja**: X pkt.

## Final Score

- **HTTP**: X pkt.
- **MQTT, WebSocket**: X pkt.
- **Inne**: X pkt.
- **Aplikacja**: X pkt.
  **Max**: 6 + 6 + 6 + 2 = 20 pkt.
  **Expected**:
  **Total**: 6 + 4 + 3 + 2 = 15 pkt.
