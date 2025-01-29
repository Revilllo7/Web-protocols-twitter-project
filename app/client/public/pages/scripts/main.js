document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    if (username) {
        const greetingElement = document.getElementById("greeting");
        greetingElement.innerHTML = `<strong>Welcome, ${username}!</strong>`;

        const profilePicture = document.createElement("img");
        profilePicture.id = "profile-picture";
        profilePicture.src = `https://api.dicebear.com/9.x/identicon/svg?seed=admin${encodeURIComponent(username)}`;
        profilePicture.alt = "Profile Picture";
        profilePicture.classList.add("profile-picture");

        greetingElement.appendChild(profilePicture);
    }
    loadPosts();
});

async function loadPosts() {
    try {
        const response = await fetch("http://localhost:3000/posts");
        if (!response.ok) throw new Error("Failed to load posts");
        const posts = await response.json();

        const postContainer = document.querySelector(".posts-section");
        postContainer.innerHTML = ""; // Clear existing posts

        const hashtagCounts = {};

        posts.forEach(post => {
            const postElement = document.createElement("div");
            postElement.classList.add("post");

            // Create the Identicon URL
            const identiconUrl = `https://api.dicebear.com/9.x/identicon/svg?seed=admin${encodeURIComponent(post.user)}`;

            postElement.innerHTML = `
                <h3>
                    <img class="identicon" src="${identiconUrl}" alt="Identicon">
                    <span class="username">${post.user}</span>
                </h3>
                <p>${post.content}</p>
                <small>${post.timestamp}</small>
                <p>
                    ${post.hashtags.map(tag => 
                        `<button class="hashtag-button" onclick="filterByHashtag('${tag}')">#${tag}</button>`
                    ).join(" ")}
                </p>
            `;
            postContainer.prepend(postElement); // Add new post to the top

            // Count hashtags for ranking
            post.hashtags.forEach(tag => {
                hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
            });
        });

        displayTopHashtags(hashtagCounts);
    } catch (error) {
        console.error("Error loading posts:", error);
    }
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
            body: JSON.stringify({ user: username, content, hashtags })
        });

        if (!response.ok) throw new Error("Failed to post");

        // Clear the input fields after posting
        document.getElementById("post-text").value = "";
        document.getElementById("hashtags").value = "";
        loadPosts();
    } catch (error) {
        console.error("Error posting:", error);
        alert("Failed to post. Please try again.");
    }
}
