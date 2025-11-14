import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import "./chatbox.css";

function ChatBox({ currentSession, setCurrentSession }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // 🟢 Hiển thị lại tin nhắn khi người dùng chọn session khác
  useEffect(() => {
    if (currentSession?.messages) {
      setMessages(currentSession.messages);
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  // 🟢 Hàm gửi tin nhắn
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          session_id: currentSession?.id || null, // gửi session_id hiện tại (nếu có)
        }),
      });

      const data = await res.json();

      const botMessage = { role: "bot", text: data.response || "Không có phản hồi." };

      // 🟢 Cập nhật messages hiển thị
      setMessages((prev) => [...prev, botMessage]);

      // 🟢 Cập nhật session hiện tại
      setCurrentSession((prev) => ({
        ...(prev || {}),
        id: data.session_id || prev?.id,
        messages: [...(prev?.messages || []), userMessage, botMessage],
      }));

      setInput("");
    } catch (err) {
      console.error("❌ Lỗi gửi tin nhắn:", err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Không thể gửi tin nhắn. Kiểm tra kết nối backend." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatbox-container">
      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="placeholder">
            💬 Hãy hỏi tôi bất kỳ điều gì về lập trình hoặc tài liệu học tập của bạn!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <div className="bubble">
                {msg.role === "bot" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      p: ({ node, ...props }) => (
                        <p style={{ margin: "4px 0" }} {...props} />
                      ),
                      code: ({ node, inline, className, children, ...props }) =>
                        !inline ? (
                          <pre className={className}>
                            <code {...props}>{children}</code>
                          </pre>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* 🟩 Ô nhập và nút gửi */}
      <div className="chat-input">
        <input
          type="text"
          placeholder="Nhập câu hỏi..."
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
