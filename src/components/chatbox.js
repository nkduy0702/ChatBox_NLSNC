import React, { useState, useEffect, useRef } from "react";
import "./chatbox.css";

function ChatBox({ selectedChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // trạng thái AI đang trả lời
  const bottomRef = useRef(null);

  // Hiển thị lại lịch sử chat khi chọn
  useEffect(() => {
    if (selectedChat && selectedChat.messages) {
      setMessages(selectedChat.messages);
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  const handleSend = async () => {
    if (!input.trim() || loading) return; // không gửi nếu đang loading

    const newMessages = { role: "user", content: input };
    setMessages((msg) => [...msg, newMessages]);

    const bodyChat = {
      model: "mymodel:latest",
      messages: [{ role: "user", content: input }],
      stream: false,
    };
    setInput("");
    setLoading(true); // bắt đầu gửi

    try {
      const res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyChat),
      });
      // Giải mã dữ liệu sau trả về
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let data;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          data = JSON.parse(line);
        }
      }
      if (data.message) {
        const assistantMessage = {
          role: data.message.role,
          content: data.message.content,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error("❌ Lỗi gửi tin nhắn:", err);
      const errorMessage = {
        role: "assistant",
        text: "❌ Có lỗi xảy ra khi gửi tin nhắn.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false); // AI trả lời xong
    }
  };

  // Tự động cuộn xuống tin nhắn mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatbox-container">
      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="placeholder">
            💬 Hỏi tôi bất kỳ điều gì về lập trình hoặc tài liệu của bạn!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <div className="bubble">{msg.content}</div>
            </div>
          ))
        )}
        <div ref={bottomRef}></div>
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Nhập câu hỏi của bạn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? "Đang gửi..." : "Gửi"}
        </button>
      </div>
    </div>
  );
}

export default ChatBox;
