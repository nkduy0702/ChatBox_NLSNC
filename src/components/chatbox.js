import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import "./chatbox.css";

function ChatBox({ currentSession, setCurrentSession, setSessions }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Hiển thị lại tin nhắn khi chọn session từ sidebar
  useEffect(() => {
    setMessages(currentSession?.messages || []);
  }, [currentSession]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    // for finetune model Ollama
    // const newMessages = { role: "user", content: input };
    // setMessages((msg) => [...msg, newMessages]);

    // const bodyChat = {
    //   model: "gemma-3-software:latest",
    //   messages: [{ role: "user", content: input }],
    //   stream: false,
    // };

    // try {
    //     const res = await fetch("http://localhost:11434/api/chat", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify(bodyChat),
    //     });
    //     // Giải mã dữ liệu sau trả về
    //     const reader = res.body.getReader();
    //     const decoder = new TextDecoder();
    //     let data;
    //     while (true) {
    //         const { done, value } = await reader.read();
    //         if (done) break;
    //         const chunk = decoder.decode(value);
    //         const lines = chunk.split("\n").filter(Boolean);
    //         for (const line of lines) {
    //         data = JSON.parse(line);
    //         }
    //     }
    //     if (data.message) {
    //         const assistantMessage = {
    //         role: data.message.role,
    //         content: data.message.content,
    //         };
    //         setMessages((prev) => [...prev, assistantMessage]);
    //     }
    //     } catch (err) {
    //     console.error("❌ Lỗi gửi tin nhắn:", err);
    //     const errorMessage = {
    //         role: "assistant",
    //         text: "❌ Có lỗi xảy ra khi gửi tin nhắn.",
    //     };
    //     setMessages((prev) => [...prev, errorMessage]);
    //     } finally {
    //     setLoading(false); // AI trả lời xong
    //     }
    // };

    // for vector database
    const userMessage = { role: "user", text: input };
    // ✅ Hiển thị ngay user message
    setMessages((prev) => [...prev, userMessage]);
    const msgText = input;
    setInput("");

    try {
      let sessionId = currentSession?.id;

      // Nếu session chưa có ID → tạo session mới trên backend
      if (!sessionId) {
        const resSession = await fetch("http://127.0.0.1:5000/sessions", {
          method: "POST",
        });
        const newSession = await resSession.json();
        sessionId = newSession.id;

        // ✅ Giữ messages hiện tại, chỉ cập nhật ID và timestamp
        setCurrentSession((prev) => ({
          ...prev,
          id: sessionId,
          timestamp: newSession.timestamp,
          messages: prev?.messages || [userMessage],
        }));
      }

      // Gửi câu hỏi tới backend
      const res = await fetch("http://127.0.0.1:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText, session_id: sessionId }),
      });
      const data = await res.json();

      const botMessage = {
        role: "bot",
        text: data.response || "⚠️ Bot không trả lời được.",
      };

      // ✅ Thêm bot message vào messages
      setMessages((prev) => [...prev, botMessage]);

      // ✅ Cập nhật session hiện tại và sidebar
      setCurrentSession((prev) => {
        const updatedSession = {
          ...(prev || {}),
          id: sessionId,
          messages: [...(prev?.messages || []), botMessage],
          topic: prev?.topic || msgText.slice(0, 50),
          isNew: false,
          timestamp: prev?.timestamp || data.timestamp,
        };

        setSessions((prevSessions) => {
          const exists = prevSessions.some((s) => s.id === updatedSession.id);
          if (!exists) return [updatedSession, ...prevSessions];
          else
            return prevSessions.map((s) =>
              s.id === updatedSession.id ? updatedSession : s
            );
        });

        return updatedSession;
      });
    } catch (err) {
      console.error("❌ Lỗi gửi tin nhắn:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "⚠️ Không thể gửi tin nhắn. Kiểm tra kết nối backend.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatbox-container">
      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="placeholder">
            💬 Hãy hỏi tôi bất kỳ điều gì về lập trình hoặc tài liệu học tập của
            bạn!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <div className="bubble">
                {msg.role === "bot" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
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

        {loading && <div className="bot-typing">🤖 Đang trả lời...</div>}
        <div ref={bottomRef}></div>
      </div>

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
