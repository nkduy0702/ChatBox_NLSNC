import React from "react";
import "./history.css";

function History({ history, onSelectHistory }) {
  return (
    <div className="history-section">
      <div className="history-list">
        {history.length === 0 ? (
          <p className="no-history">Chưa có hội thoại nào.</p>
        ) : (
          history.map((h, i) => (
            <div
              key={i}
              className="history-item"
              onClick={() => onSelectHistory(h.id)} // ✅ Gọi callback khi click
            >
              <div className="timestamp">{h.timestamp}</div>
              <div className="question">👨‍💻 {h.user}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;
