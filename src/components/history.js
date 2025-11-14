import React from "react";
import "./history.css";

function History({ history, onSelectHistory, currentSessionId }) {
  return (
    <div className="history-section">
      <div className="history-list">
        {history.length === 0 ? (
          <p className="no-history">Chưa có hội thoại nào.</p>
        ) : (
          history.map((h) => (
            <div
              key={h.id}
              className={`history-item ${h.id === currentSessionId ? "active" : ""}`}
              onClick={() => onSelectHistory(h.id)}
              title={h.topic || "Không có chủ đề"}
            >
              <div className="question">
                {h.topic
                  ? h.topic.slice(0, 30) + (h.topic.length > 30 ? "..." : "")
                  : "Không có chủ đề"}
              </div>
              <div className="timestamp">{h.timestamp}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;
