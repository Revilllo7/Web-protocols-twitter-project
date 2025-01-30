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
    loadPosts(); // Load all posts initially
});

// Utility function to get a cookie by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

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
        const response = await fetch("http://localhost:3000/login", {
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
            alert(result.message);
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
        const response = await fetch("http://localhost:3000/posts", {
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
        const response = await fetch("http://localhost:3000/posts");
        if (!response.ok) throw new Error("Failed to load posts");
        const posts = await response.json();

        const postContainer = document.querySelector(".posts-section");
        postContainer.innerHTML = ""; // Clear existing posts

        const username = getCookie("username");
        const isAdmin = getCookie("role") === "admin"; // Use role from cookies

        // Add "Show All Posts" button if filtering by tag or search query
        if (filteredTag || searchQuery) {
            const resetButton = document.createElement("button");
            resetButton.textContent = "Show All Posts";
            resetButton.classList.add("reset-button");
            resetButton.onclick = () => loadPosts(); // Reset posts
            postContainer.appendChild(resetButton);
        }

        // Filter posts based on the selected hashtag (filteredTag)
        const filteredPosts = filteredTag ? posts.filter(post => post.hashtags.includes(filteredTag)) : posts;

        filteredPosts.forEach(post => {
            const postElement = document.createElement("div");
            postElement.classList.add("post");
        
            const identiconUrl = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(post.user)}`;
        
            // Create the post header
            const postHeader = document.createElement("h3");
            const identiconImg = document.createElement("img");
            identiconImg.classList.add("identicon");
            identiconImg.src = identiconUrl;
            identiconImg.alt = "Identicon";
            
            const usernameSpan = document.createElement("span");
            usernameSpan.classList.add("username");
            usernameSpan.textContent = post.user;
        
            // Add admin emblem if the post author is admin
            if (post.user === "admin") {
                const adminEmblem = document.createElement("span");
                adminEmblem.classList.add("admin-emblem");
                adminEmblem.textContent = "Admin";
                usernameSpan.appendChild(adminEmblem);
            }
        
            postHeader.appendChild(identiconImg);
            postHeader.appendChild(usernameSpan);
        
            postElement.innerHTML = `
                ${postHeader.outerHTML}  <!-- Use the dynamically created post header -->
                <p>${post.content}</p>
                <small>${post.timestamp}</small>
                <p>
                    ${post.hashtags.map(tag => 
                        `<button class="hashtag-button" onclick="filterByHashtag('${tag}')">#${tag}</button>`).join(" ")}
                </p>
                ${post.user === username || isAdmin ? 
                    `<button onclick="editPost(${JSON.stringify(post).replace(/"/g, '&quot;')})">Edit</button>
                    <button onclick="removePost('${post.id}')">Remove</button>` : ''}
            `;
            postContainer.appendChild(postElement);
        });

        // Display the most popular hashtags
        const hashtagCounts = {};
        posts.forEach(post => {
            post.hashtags.forEach(tag => {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });
        });
        displayTopHashtags(hashtagCounts);

    } catch (error) {
        console.error("Error loading posts:", error);
    }
}


function matchSearchQuery(content, query) {
    if (query.startsWith("#")) {
        return content.toLowerCase().includes(query.toLowerCase());
    }
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
        button.addEventListener("click", () => {
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

    async function handleSave() {
        try {
            const updatedContent = postTextElement.value.trim();
            if (updatedContent === post.content) return; // No change to save

            const response = await fetch(`http://localhost:3000/posts/${post.id}`, {
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
        const response = await fetch(`http://localhost:3000/posts/${postId}`, {
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
    const response = await fetch(`http://localhost:3000/posts/${postId}`);
    if (response.ok) {
        return response.json();
    }
    return null;
}
