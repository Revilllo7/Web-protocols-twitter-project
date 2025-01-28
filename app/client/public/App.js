import React from "react";
import Posts from "./FetchPosts.js"; // Ensure this file exists
import styles from "./css";
import SearchBar from "./components/SearchBar.js";

const App = () => {
    return (
        <main>
            <aside className="hashtags-section">
                <h2>Trending Hashtags</h2>
                <ul>
                    <li>#Placeholder1</li>
                    <li>#Placeholder2</li>
                    <li>#Placeholder3</li>
                    <li>#Placeholder4</li>
                    <li>#Placeholder5</li>
                </ul>
            </aside>

            <Posts /> {/* This dynamically loads posts */}
            <SearchBar /> {/* This dynamically filters posts */}

            <aside className="messages">
                <h2>Messages</h2>
            </aside>
        </main>
    );
};

export default App;
