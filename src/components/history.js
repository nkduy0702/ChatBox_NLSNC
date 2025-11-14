import React from "react";
import "./history.css";

function History({ history, onSelectHistory }) {
  return (
    <div className="history-section">
      <div className="history-list">
        {history.length === 0 ? (
          <p className="no-history">Chưa có hội thoại nào.</p>
        ) : (
          history.map((h) => (
            <div
              key={h.id}
              className="history-item"
              onClick={() => onSelectHistory(h.id)}
            >
              <div className="timestamp">{h.timestamp}</div>
              <div className="question">💬 {h.topic || "Không có chủ đề"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;
