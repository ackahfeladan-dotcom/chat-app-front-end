import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// Establishes the real-time websocket link to our backend
const socket = io.connect('https://chat-app-backend-osyn.onrender.com');

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [contactInput, setContactInput] = useState('');
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState('');
  const [currentRoomId, setCurrentRoomId] =useState("");
  const messagesEndRef = useRef(null);
  const [typingStatus, setTypingStatus] = useState("");

useEffect(() => {
    // 1. Listen for the backend confirming a chat link is active
    socket.on("chat_joined", ({ roomId, target }) => {
        console.log("Chat linked for room ID:", roomId);
        setCurrentRoomId(roomId);
        setActiveChat(target); // Sets the header name to the friend you added

        // 2. Automatically add them to your sidebar contact list array
        setContacts((prev) => {
            if (!prev.includes(target)) {
                return [...prev, target];
            }
            return prev;
        });
    });

    // 3. Keep your auto-scroll helper running smoothly
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // 4. Clean up listener when the app reloads to prevent layout bugs
    return () => {
        socket.off("chat_joined");
    };
}, [messageList]);
const handleAddContact = async () => {
    if (!contactInput.trim()) return;

    const cleanTarget = contactInput.toLowerCase().trim();
    const cleanMe = username.toLowerCase().trim();

    try {
      // 1. Save to your live Render database
      const response = await fetch('https://chat-app-backend-osyn.onrender.com/add-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: cleanMe,
          contactName: cleanTarget
        })
      });

      const data = await response.json();
      console.log("Logged in successfully:", data);

      // 2. Signal the live socket server to open the chat room
      socket.emit("access_chat", {
        currentUsername: cleanMe,
        targetUsername: cleanTarget
      });

      // 3. Update UI states
      setContacts((prev) => [...prev, cleanTarget]);
      setContactInput('');
    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };
 const joinRoom = () => {
    if (username !== "") {
        const cleanName = username.toLowerCase().trim();
        
        // 💡 Added the arrow function callback at the end to prevent server crashes
        socket.emit("login_user", cleanName, (response) => {
            console.log("Logged in successfully:", response);
        });
        
        setJoined(true);
    }
};

 const sendMessage = async () => {
    if (message !== "" && currentRoomId !== "") {

      const messageData = {
        room:currentRoomId,
        author: username,
        recipient: activeChat,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      await socket.emit('send_message', messageData);
      setMessageList((list) => [...list, messageData]);
      setMessage('');
    }
  };

useEffect(() => {
    // Listen for incoming global messages
    socket.on('receive_message', (data) => {
      if (data.room === currentRoomId) {
        setMessageList((list) => [...list, data]);
      }
    });
    // Add this starting at line 55:
    socket.on("user_typing", (data) => {
        setTypingStatus(`${data.username} is typing...`);
    });

    socket.on("user_stop_typing", () => {
        setTypingStatus("");
    });

    // Listen for database history logs initialization
    socket.on('chat_initialized', ({ roomId, history }) => {
      setCurrentRoomId(roomId); 
      setMessageList(history);  
    });

    return () => {
      socket.off('receive_message');
      socket.off('chat_initialized');
      socket.off('user_typing');      // <-- Add this cleanup
      socket.off('user_stop_typing'); //<-- Add this cleanup
    };
  }, [currentRoomId]);
return (
    <div className="App">
{!joined ? (
        <div className="login-container">
          <div className="login-card">
            <div className="login-logo">
              <svg viewBox="0 0 24 24" width="50" height="50" fill="currentColor">
                <path d="M12.003 21.13c-.417 0-.817-.072-1.196-.21a1.002 1.002 0 0 0-.796.066L7 22.5v-3.323a1 1 0 0 0-.317-.724A9.231 9.231 0 0 1 3.5 12c0-4.963 4.037-9 9-9s9 4.037 9 9-4.037 9-9 9.13zM12 1a11 11 0 0 0-8.91 17.416L2 23l4.796-1.744A10.941 10.941 0 0 0 12 23c6.075 0 11-4.925 11-11S18.075 1 12 1z"/>
              </svg>
            </div>
            <h2>Welcome to ChatApp</h2>
            <p>Enter your username to launch your real-time chat dashboard.</p>
            
            <div className="login-form-group">
              <input 
                type="text" 
                placeholder="Your Name..." 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && joinRoom()}
              />
              <button onClick={joinRoom}>Login</button>
            </div>
          </div>
        </div>
      ) : (
 <div className="chat-container">
      {/* SIDEBAR CONTAINER */}
      <div className="sidebar">
        
        <div className="sidebar-header">
          <h2>Chats</h2>
          <h4 style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>Welcome, {username}</h4>
          
          <div className="add-user-form">
            <input
              type="text"
              placeholder="Add contact name..."
              autoCapitalize="none"
              autoCorrect="off"
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value.toLowerCase().trim())}
            />
            <button onClick={handleAddContact}>Add</button>
          </div>
        </div>
            
{/* CONTACTS LIST */}
        <div className="users-list">
          {contacts.map((contact, idx) => (
            <div 
              key={idx} 
              className={`user-item ${activeChat === contact ? 'active' : ''}`}
              onClick={() => {
                setActiveChat(contact);
                socket.emit("access_chat", {
                  currentUsername: username.toLowerCase().trim(),
                  targetUsername: contact
                });
              }}
            >
              <span className="username-text">{contact}</span>
            </div>
          ))}
        </div>
</div> {/* This closes your sidebar cleanly */}

    {/* MAIN CHAT SCREEN AREA */}
    <div className="chat-window">
      {activeChat ? (
        <>
          <div className="sidebar-header" style={{ padding: '16px 24px', background: 'var(--bg-sidebar)' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>
              Chatting with: <span className="username-text">{activeChat}</span>
            </p>
          </div>
          
 <div className="chat-messages">
            {messageList.map((content, idx) => {
              const isOwnMessage = content.author === username;
              return (
                <div 
                  key={idx} 
                  className={`message-bubble ${isOwnMessage ? 'me' : 'them'}`}
                  style={{ position: 'relative', paddingBottom: '20px' }}
                >
                  <p style={{ margin: 0 }}>{content.message}</p>
                  <span style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-muted)', 
                    position: 'absolute', 
                    bottom: '2px', 
                    right: '8px' 
                  }}>
                    {content.timestamp ? new Date(content.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })}
          
       <div ref={messagesEndRef} />
    </div>
   {typingStatus && (
  <div style={{ padding: '5px 15px', fontSize: '13px', color: '#8696a0', fontStyle: 'italic' }}>
    {typingStatus}
  </div>
  )}
  {typingStatus && (
  <div style={{ padding: '5px 15px', fontSize: '13px', color: '#8696a0', fontStyle: 'italic', background: '#f0f2f5' }}>
    {typingStatus}
  </div>
)}
 <div className="chat-input-area">
  <input 
    type="text"
    value={message}
    placeholder="Type a message..."
    onChange={(e) => {
      setMessage(e.target.value);
      if (e.target.value !== "") {
        socket.emit("typing", { room: currentRoomId, username: username });
      } else {
        socket.emit("stop_typing", { room: currentRoomId });
      }
    }}
    onBlur={() => socket.emit("stop_typing", { room: currentRoomId })}
    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
  />
                  <button onClick={sendMessage} style={{ padding: '10px 20px', cursor: 'pointer' }}>Send</button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                <h3>Select a contact to start chatting</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;