document.addEventListener("DOMContentLoaded", () => {
    const username = getCookie("username");  // Read from cookies
    const role = getCookie("role"); // Read user role from cookies
    
    if (username) {
        const greetingElement = document.getElementById("greeting");
        greetingElement.innerHTML = `<strong>Welcome, ${username}!</strong>`;

        // Check if the logged-in user is admin
        if (username === "admin") {
            const adminEmblem = document.createElement("span");
            adminEmblem.classList.add("admin-emblem");
            adminEmblem.textContent = "Admin";
            greetingElement.appendChild(adminEmblem);
        }

        const profilePicture = document.createElement("img");
        profilePicture.id = "profile-picture";
        profilePicture.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(username)}`;
        profilePicture.alt = "Profile Picture";
        profilePicture.classList.add("profile-picture");

        greetingElement.appendChild(profilePicture);
    }
    loadPosts();
    const searchInput = document.getElementById("search-bar");
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        loadPosts(null, query); // Reload posts based on search query
    }); // Load all posts initially

    // Establish WebSocket connection to the server
    const socket = new WebSocket("ws://localhost:3001");

    // Handle incoming WebSocket messages
    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        displayMessage(data.room, data.message);
    });

    // Function to handle message sending in a room
    window.sendMessage = function(event) {
        event.preventDefault(); // Prevent the default form submission behavior

        const messageInput = document.getElementById("message-input");
        const message = messageInput.value.trim();
        const activeRoomElement = document.querySelector(".message-container.active-room");

        if (!activeRoomElement) {
            alert("No active room selected.");
            return;
        }

        const activeRoom = activeRoomElement.id;

        if (!message) {
            alert("Message cannot be empty.");
            return;
        }

        const room = activeRoom.replace("room-", ""); // Extract room number from the ID

        socket.send(JSON.stringify({ room, message }));

        // Clear the input field after sending the message
        messageInput.value = "";
    }

    // Add event listener to the send message button
    const sendMessageButton = document.getElementById("send-message-button");
    sendMessageButton.addEventListener("click", sendMessage);

    // Add event listeners for each room button
    const roomButtons = document.querySelectorAll(".room-button");
    roomButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault(); // Prevent default action
            let roomId = button.getAttribute("data-room");  // Get the room ID directly (room1, room2, room3, room4)
            roomId = roomId.replace('room', ''); // Extract the number from the room ID
            switchRoom(roomId);  // Pass the roomId directly to switchRoom
        });
    });

    // Function to switch rooms
    async function switchRoom(roomId) {
        // Hide all rooms
        const rooms = document.querySelectorAll(".message-container");
        rooms.forEach(room => room.style.display = "none");

        // Remove 'active-room' class from all rooms
        rooms.forEach(room => room.classList.remove("active-room"));

        // Correctly select the room by its ID
        const newRoom = document.getElementById(`room-${roomId}`); // Room should have room-ID (e.g., room-1)

        if (newRoom) {  // Check if the room element exists
            newRoom.style.display = "block";  // Show the room
            newRoom.classList.add("active-room");  // Add active class to the room

            // Fetch and display messages for the selected room
            try {
                const response = await fetch(`https://localhost:3000/rooms/${roomId}`);
                if (!response.ok) throw new Error("Failed to load messages");
                const messages = await response.json();

                const messageList = newRoom.querySelector(".message-list");
                messageList.innerHTML = ""; // Clear existing messages

                messages.forEach(message => {
                    displayMessage(roomId, message);
                });
            } catch (error) {
                console.error("Error loading messages:", error);
            }
        } else {
            console.error(`Room with id 'room-${roomId}' not found.`);
        }
    }

    // A simple function to display messages in the respective room
    function displayMessage(room, message) {
        const roomDiv = document.querySelector(`#room-${room} .message-list`);
        const messageElement = document.createElement("div");
        messageElement.textContent = message;
        roomDiv.appendChild(messageElement);
        roomDiv.scrollTop = roomDiv.scrollHeight;  // Auto-scroll to the latest message
    }
});

// Utility function to set a cookie
function setCookie(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000)); // Set expiry date
    document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}; Secure; SameSite=Lax`;
}

// Utility function to delete a cookie
function deleteCookie(name) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`; // Set expiry date to past
}

// Helper functions for cookies
function getCookie(name) {
    const cookieArr = document.cookie.split("; ");
    for (let i = 0; i < cookieArr.length; i++) {
        const cookiePair = cookieArr[i].split("=");
        if (cookiePair[0] === name) {
            return decodeURIComponent(cookiePair[1]);
        }
    }
    return null;
}

async function login(username, password) {
    try {
        const response = await fetch("https://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();
        if (result.success) {
            setCookie("username", username); // Store username in cookie
            setCookie("role", result.role); // Store user role in cookie
            loadPosts(); // Reload posts after successful login
        } else {
            // alert(result.message);
        }
    } catch (error) {
        console.error("Error logging in:", error);
        alert("Login failed. Please try again.");
    }
}

async function addPost() {
    const username = getCookie("username");  // Read from cookies
    const content = document.getElementById("post-text").value.trim();
    const hashtags = document.getElementById("hashtags").value.split(",").map(h => h.trim()).filter(Boolean);

    // Check if username exists
    if (!username) {
        alert("You must be logged in to post.");
        return;
    }

    // Check if content is not empty
    if (!content) {
        alert("Post cannot be empty.");
        return;
    }

    // Log the request body for debugging
    console.log("Request Body:", { user: username, content, hashtags });

    try {
        const response = await fetch("https://localhost:3000/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user: username,
                content,
                hashtags,
                timestamp: new Date().toISOString(),
                edited: false
            })
        });

        if (!response.ok) throw new Error("Failed to post");

        // Clear the input fields after posting
        document.getElementById("post-text").value = "";
        document.getElementById("hashtags").value = "";
        loadPosts(); // Reload all posts after posting
    } catch (error) {
        console.error("Error posting:", error);
        alert("Failed to post. Please try again.");
    }
}

async function loadPosts(filteredTag = null, searchQuery = "") {
    try {
        const response = await fetch("https://localhost:3000/posts");
        if (!response.ok) throw new Error("Failed to load posts");
        const posts = await response.json();

        const postContainer = document.querySelector(".posts-section");
        postContainer.innerHTML = ""; // Clear existing posts

        const username = getCookie("username");
        const isAdmin = getCookie("role") === "admin"; // Use role from cookies

        // Preserve top hashtags by calculating them first
        const hashtagCounts = {};
        posts.forEach(post => {
            post.hashtags.forEach(tag => {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });
        });
        displayTopHashtags(hashtagCounts); // Ensure top hashtags are displayed before filtering

        // Filtering logic: consider both hashtags and search query
        let filteredPosts = posts;
        
        if (filteredTag) {
            filteredPosts = filteredPosts.filter(post => post.hashtags.includes(filteredTag));
        }

        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filteredPosts = filteredPosts.filter(post => 
                post.content.toLowerCase().includes(lowerCaseQuery) || 
                post.hashtags.some(tag => tag.toLowerCase().includes(lowerCaseQuery.replace("#", "")))
            );
        }

        // Show "Show All Posts" button if filtering
        if (filteredTag || searchQuery) {
            const resetButton = document.createElement("button");
            resetButton.textContent = "Show All Posts";
            resetButton.classList.add("reset-button");
            resetButton.onclick = () => loadPosts(); // Reset posts
            postContainer.appendChild(resetButton);
        }

        // Render filtered posts
        filteredPosts.forEach(post => {
            const postElement = document.createElement("div");
            postElement.classList.add("post");

            const identiconUrl = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(post.user)}`;

            const postHeader = document.createElement("h3");
            const identiconImg = document.createElement("img");
            identiconImg.classList.add("identicon");
            identiconImg.src = identiconUrl;
            identiconImg.alt = "Identicon";

            const usernameSpan = document.createElement("span");
            usernameSpan.classList.add("username");
            usernameSpan.textContent = post.user;

            if (post.user === "admin") {
                const adminEmblem = document.createElement("span");
                adminEmblem.classList.add("admin-emblem");
                adminEmblem.textContent = "Admin";
                usernameSpan.appendChild(adminEmblem);
            }

            postHeader.appendChild(identiconImg);
            postHeader.appendChild(usernameSpan);

            postElement.innerHTML = `
                ${postHeader.outerHTML}  
                <p>${post.content}</p>
                <small>${post.timestamp}</small>
                <p>
                    ${post.hashtags.map(tag => 
                        `<button class="hashtag-button" onclick="filterByHashtag('${tag}')">#${tag}</button>`).join(" ")}
                </p>
                    ${post.user === username || isAdmin ? 
                        `<button class="edit-button" onclick="editPost(${JSON.stringify(post).replace(/"/g, '&quot;')})">Edit</button>
                        <button class="remove-button" onclick="removePost('${post.id}')">Remove</button>` 
                    : ''}
            `;
            postContainer.appendChild(postElement);
        });

    } catch (error) {
        console.error("Error loading posts:", error);
    }
}

// Function to match search query in content, including hashtags
function matchSearchQuery(content, query) {
    // If the query starts with "#", treat it as a hashtag search
    if (query.startsWith("#")) {
        return content.toLowerCase().includes(query.toLowerCase());
    }
    // Otherwise, search for the string in the content
    return content.toLowerCase().includes(query.toLowerCase());
}

function filterByHashtag(tag) {
    loadPosts(tag); // Reload posts filtered by the clicked hashtag
}

function displayTopHashtags(hashtagCounts) {
    const sortedHashtags = Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14);

    const hashtagList = document.getElementById("top-hashtags");
    hashtagList.innerHTML = "";
    sortedHashtags.forEach(([tag, count]) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `<button class="top-hashtag-button" data-hashtag="${tag}">#${tag} (${count})</button>`;
        hashtagList.appendChild(listItem);
    });

    document.querySelectorAll(".top-hashtag-button").forEach(button => {
        button.addEventListener("click", (event) => {
          
            event.preventDefault();

            const selectedHashtag = button.dataset.hashtag;
            loadPosts(selectedHashtag);
        });
    });
}

// Modified `editPost` function to allow admin and owner editing
async function editPost(post) {
    const username = getCookie("username");
    const role = getCookie("role"); // Assuming you store the role in a cookie after login

    console.log("User Role:", role);
    if (!role) {
        alert("User role not detected. Please log in again.");
        return;
    }

    if (role !== "admin" && post.user !== username) {
        alert("You are not authorized to edit this post.");
        return;
    }

    const postTextElement = document.getElementById("post-text");
    postTextElement.value = post.content; // Use 'value' for textarea content

    const postButton = document.getElementById("post-button");
    postButton.textContent = "Save"; // Change the button text to "Save"

    postButton.removeEventListener("click", handleSave);
    postButton.addEventListener("click", handleSave);

    async function handleSave(event) {

        event.preventDefault(); // Prevent the default form submission behavior

        try {
            const updatedContent = postTextElement.value.trim();
            if (updatedContent === post.content) return; 

            const response = await fetch(`https://localhost:3000/posts/${post.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: updatedContent,
                    edited: true,
                    timestamp: new Date().toISOString(),
                })
            });

            if (!response.ok) throw new Error("Failed to edit post");

            loadPosts(); // Reload posts after editing
        } catch (error) {
            console.error("Error editing post:", error);
            alert("Failed to edit post. Please try again.");
        }
    }
}

// Modified `removePost` function to allow admin to delete any post
async function removePost(postId) {
    const username = getCookie("username");
    const role = getCookie("role");

    const post = await fetchPostById(postId);
    if (!post) {
        alert("Post not found.");
        return;
    }

    console.log("Removing post:", postId, "User:", username, "Role:", role);

    if (role !== "admin" && post.user !== username) {
        alert("You are not authorized to delete this post.");
        return;
    }

    try {
        console.log("Sending DELETE request...");
        const response = await fetch(`https://localhost:3000/posts/${postId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, role })
        });

        console.log("Response received:", response);
        if (!response.ok) {
            const errorMessage = await response.json();
            throw new Error(errorMessage.message || "Failed to delete post");
        }

        loadPosts(); // Reload posts after deletion
    } catch (error) {
        console.error("Error removing post:", error);
        alert("Failed to delete post. Please try again.");
    }
}

// Fetch a post by ID
async function fetchPostById(postId) {
    const response = await fetch(`https://localhost:3000/posts/${postId}`);
    if (response.ok) {
        return response.json();
    }
    return null;

}

// Establish WebSocket connection to the server
const socket = new WebSocket("ws://localhost:3001");

socket.addEventListener("open", () => {
    console.log("WebSocket connection established");
});

socket.addEventListener("close", () => {
    console.log("WebSocket connection closed");
});

socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
});

// Function to handle message sending in a room
function sendMessage(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    const messageInput = document.getElementById("message-input");
    const message = messageInput.value.trim();
    const activeRoom = document.querySelector(".message-container.active-room").id;

    if (!message) {
        alert("Message cannot be empty.");
        return;
    }

    const room = activeRoom.replace("room-", ""); // Extract room number from the ID

    socket.send(JSON.stringify({ room, message }));

    // Clear the input field after sending the message
    messageInput.value = "";
}

// A simple function to display messages in the respective room
function displayMessage(room, message) {
    const roomDiv = document.querySelector(`#room-${room} .message-list`);
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    roomDiv.appendChild(messageElement);
    roomDiv.scrollTop = roomDiv.scrollHeight;  // Auto-scroll to the latest message
}

// Handle incoming WebSocket messages
socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    displayMessage(data.room, data.message);
});

// Function to switch rooms
async function switchRoom(roomId) {
    // Hide all rooms
    const rooms = document.querySelectorAll(".message-container");
    rooms.forEach(room => room.style.display = "none");

    // Remove 'active-room' class from all rooms
    rooms.forEach(room => room.classList.remove("active-room"));

    // Correctly select the room by its ID
    const newRoom = document.getElementById(`room-${roomId}`); // Room should have room-ID (e.g., room-1)

    if (newRoom) {  // Check if the room element exists
        newRoom.style.display = "block";  // Show the room
        newRoom.classList.add("active-room");  // Add active class to the room

        // Fetch and display messages for the selected room
        try {
            const response = await fetch(`https://localhost:3000/rooms/${roomId}`);
            if (!response.ok) throw new Error("Failed to load messages");
            const messages = await response.json();

            const messageList = newRoom.querySelector(".message-list");
            messageList.innerHTML = ""; // Clear existing messages

            messages.forEach(message => {
                displayMessage(roomId, message);
            });
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    } else {
        console.error(`Room with id 'room-${roomId}' not found.`);
    }
}

// Add event listeners for each room button
document.addEventListener("DOMContentLoaded", () => {
    const roomButtons = document.querySelectorAll(".room-button");
    roomButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault(); // Prevent the default link behavior
            let roomId = button.getAttribute("data-room");  // Get the room ID directly (room1, room2, room3, room4)
            roomId = roomId.replace('room', ''); // Extract the number from the room ID
            switchRoom(roomId);  // Pass the roomId directly to switchRoom
        });
    });

    // Add event listener to the send message button
    const sendMessageButton = document.getElementById("send-message-button");
    sendMessageButton.addEventListener("click", sendMessage);
});