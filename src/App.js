import React from "react";
import ChatBox from "./chatbox";
import "./App.css";


function App() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>SmartEdu AI</h2>
          <p className="subtitle">Trợ lý học tập thông minh</p>
        </div>
        <div className="sidebar-info">
          <p>🌐 Chủ đề: <strong>Giáo dục</strong></p>
          <p>🤖 Model: GEMINI</p>
        </div>
      </aside>

      <main className="chat-area">
        <ChatBox />
      </main>
    </div>
  );
}

export default App;
