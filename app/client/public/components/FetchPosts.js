import React, { useEffect, useState } from "react";

const Posts = () => {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        console.log("Fetching posts..."); // Check if this is logged
        fetch("http://localhost:3000/api/posts")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((data) => {
                console.log("Posts fetched successfully:", data); // Log the fetched data
                setPosts(data);
            })
            .catch((error) => console.error("Error fetching posts:", error));
    }, []);

    return (
        <div className="posts-section">
            {posts.length === 0 ? (
                <p>Loading posts...</p>
            ) : (
                posts.map((post) => (
                    <div key={post.id} className="post">
                        <h3>{post.title}</h3>
                        <p>{post.content}</p>
                        <small>{post.timeStamp} ago</small>
                    </div>
                ))
            )}
        </div>
    );
};

export default Posts;
