import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ✅ Tự động cuộn xuống khi có tin nhắn mới
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    // Không gửi nếu trống hoặc đang đợi phản hồi
    if (!input.trim() || loading) return;

    const newMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // --- SỬA ĐỔI 1: Đổi 'message' thành 'query' ---
        body: JSON.stringify({ query: newMessage.text }),
      });

      const data = await response.json();

      // --- SỬA ĐỔI 2: Đổi 'reply' thành 'response' ---
      const botMessage = { sender: "bot", text: data.response };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Lỗi kết nối đến server Flask hoặc lỗi mạng." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) sendMessage();
  };

  return (
    <div className="chatbox-container">
      <div className="chat-window">
        {messages.length === 0 && (
          <div className="placeholder">
            💬 Hỏi tôi bất kỳ điều gì về tài liệu của bạn! 📚
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`msg ${msg.sender === "user" ? "user" : "bot"}`}
          >
            <div className="bubble">{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="msg bot">
            <div className="bubble typing">AI đang trả lời...</div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Nhập câu hỏi của bạn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? "Đang trả lời..." : "Gửi"}
        </button>
      </div>
    </div>
  );
}

export default ChatBox;