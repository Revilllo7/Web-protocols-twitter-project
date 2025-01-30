document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    if (username) {
        const greetingElement = document.getElementById("greeting");
        greetingElement.innerHTML = `<strong>Welcome, ${username}!</strong>`;

        const profilePicture = document.createElement("img");
        profilePicture.id = "profile-picture";
        profilePicture.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(username)}`;
        profilePicture.alt = "Profile Picture";
        profilePicture.classList.add("profile-picture");

        greetingElement.appendChild(profilePicture);
    }
    loadPosts(); // Load all posts initially
});

async function loadPosts(filteredTag = null, searchQuery = "") {
    try {
        const response = await fetch("http://localhost:3000/posts");
        if (!response.ok) throw new Error("Failed to load posts");
        const posts = await response.json();

        const postContainer = document.querySelector(".posts-section");
        postContainer.innerHTML = ""; // Clear existing posts

        // Add "Show All Posts" button if filtering by tag or search query
        if (filteredTag || searchQuery) {
            const resetButton = document.createElement("button");
            resetButton.textContent = "Show All Posts";
            resetButton.classList.add("reset-button");
            resetButton.onclick = () => loadPosts(); // Reset posts
            postContainer.appendChild(resetButton);
        }

        // Count hashtags for displayTopHashtags function
        const hashtagCounts = {};
        posts.forEach(post => {
            post.hashtags.forEach(tag => {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });

            // Handle hashtag search query
            const matchesHashtag = filteredTag ? post.hashtags.includes(filteredTag) : true;
            const matchesSearch = searchQuery ? matchSearchQuery(post.content, searchQuery) : true;

            if (!(matchesHashtag && matchesSearch)) return; // Filter out non-matching posts

            const postElement = document.createElement("div");
            postElement.classList.add("post");

            // Identicon URL
            const identiconUrl = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(post.user)}`;

            postElement.innerHTML = `
    <h3>
        <img class="identicon" src="${identiconUrl}" alt="Identicon">
        <span class="username">${post.user}</span>
    </h3>
    <p>${post.content}</p>
    <small>${post.timestamp}</small>
    <p>
        ${post.hashtags.map(tag => 
            `<button class="hashtag-button" onclick="filterByHashtag('${tag}')">#${tag}</button>`).join(" ")}
    </p>
    ${post.user === localStorage.getItem("username") ? 
        `<button onclick="editPost(${JSON.stringify(post).replace(/"/g, '&quot;')})">Edit</button>
        <button onclick="removePost('${post.id}')">Remove</button>` : ''}
`;
            postContainer.appendChild(postElement);
        });

        // Display top hashtags
        displayTopHashtags(hashtagCounts);

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

    // Add click event to filter posts
    document.querySelectorAll(".top-hashtag-button").forEach(button => {
        button.addEventListener("click", () => {
            const selectedHashtag = button.dataset.hashtag;
            loadPosts(selectedHashtag);
        });
    });
}

async function addPost() {
    const username = localStorage.getItem("username");
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

async function editPost(post) {
    const postTextElement = document.getElementById("post-text");
    postTextElement.value = post.content; // Use 'value' for textarea content

    const postButton = document.getElementById("post-button");
    postButton.textContent = "Save"; // Change the button text to "Save"

    // Remove existing event listener before adding new one
    postButton.removeEventListener("click", handleSave);
    postButton.addEventListener("click", handleSave);

    async function handleSave() {
        try {
            const updatedContent = postTextElement.value.trim();
            if (updatedContent === post.content) return; // No change to save

            // Ensure that the post ID is passed in the PUT request
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

async function removePost(postId) {
    try {
        const response = await fetch(`http://localhost:3000/posts/${postId}`, {
            method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to remove post");

        loadPosts(); // Reload posts after removing
    } catch (error) {
        console.error("Error removing post:", error);
        alert("Failed to remove post. Please try again.");
    }
}