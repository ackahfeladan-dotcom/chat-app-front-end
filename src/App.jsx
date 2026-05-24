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
        <div className="join-container">
          <h3>Login to Chat</h3>
          <input 
            type="text" 
            placeholder="Your Name..." 
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={joinRoom}>Login</button>
        </div>
      ) : (
        <div className="whatsapp-container" style={{ display: 'flex', width: '1000px', height: '600px', border: '1px solid #ccc', margin: '20px auto' }}>
          {/* SIDEBAR CONTAINER */}
          <div className="sidebar" style={{ width: '300px', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div style={{ padding: '10px', background: '#ededed' }}>
              <h4>Welcome, {username}</h4>
              <div style={{ display: 'flex', marginTop: '5px' }}>
  <input 
    type="text"
    placeholder="Add contact name..."
    autoCapitalize="none"
    autoCorrect="off"
    value={contactInput}
    // 🔥 Force lowercase immediately on input to stop mobile keyboard bugs
    onChange={(e) => setContactInput(e.target.value.toLowerCase().trim())}
    style={{ flex: 1, padding: '5px' }}
/>
<button onClick={() => {
    if (contactInput.trim() !== "") {
        const cleanTarget = contactInput.toLowerCase().trim();
        const cleanMe = username.toLowerCase().trim();

        socket.emit("access_chat", { 
            currentUsername: cleanMe, 
            targetUsername: cleanTarget 
        });

        // 🔥 ADD THIS LINE BACK TO USE IT AND FIX THE ERROR
        setContacts((prev) => [...prev, cleanTarget]); 

        setContactInput("");
    }
}}>Add</button>

              
              </div>
            </div>
            
 {/* CONTACTS LIST */}
<div className="contacts-list" style={{ flex: 1, overflowY: 'auto' }}>
  {contacts.map((contact, idx) => (
    <div
      key={idx}
  onClick={() => {
        // 1. Set the active contact for your UI styling
        setActiveChat(contact);
        
        // 2. Trigger the dynamic international database chat fetch
        socket.emit("access_chat", {
          currentUsername: username.toLowerCase().trim(),
          targetUsername: contact
        });
      }}
      style={{
        padding: '15px',
        borderBottom: '1px solid #eee',
        cursor: 'pointer',
        background: activeChat === contact ? '#ebebeb' : 'white'
      }}
    >
      <strong>{contact}</strong>
    </div>
  ))}
</div>
          </div>

          {/* MAIN CHAT SCREEN AREA */}
          <div className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#efeae2' }}>
            {activeChat ? (
              <>
                <div className="chat-header" style={{ padding: '10px', background: '#ededed', borderBottom: '1px solid #ccc' }}>
                  <p style={{ margin: 0 }}>Chatting with: <strong>{activeChat}</strong></p>
                </div>
                <div className="chat-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
 {messageList.map((content, idx) => {
  const isOwnMessage = content.author === username;
  
  return (
    <div
      key={idx}
      style={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        width: '100%',
        marginBottom: '10px'
      }}
    >
      <div
        style={{
          background: isOwnMessage ? '#d9fdd3' : '#ffffff',
          color: '#303030',
          padding: '8px 12px',
          borderRadius: '8px',
          maxWidth: '60%',
          boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
          position: 'relative'
        }}
      >
        <p style={{ margin: 0, paddingRight: '35px', fontSize: '15px', wordBreak: 'break-word' }}>
          {content.message}
        </p>
        <span 
          style={{ 
            fontSize: '10px', 
            color: '#8696a0', 
            position: 'absolute', 
            bottom: '2px', 
            right: '5px' 
          }}
        >
          {content.timestamp ? new Date(content.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : content.time}
        </span>
      </div>
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
  <div className="chat-footer" style={{ display: 'flex', padding: '10px', background: '#f0f0f0', borderTop: '1px solid #ccc' }}>
  <input
  type="text"
  value={message}
  placeholder="Type a message..."
  onChange={(e) => {
    setMessage(e.target.value);

    // If input is not empty, tell the server we are typing
    if (e.target.value !== "") {
      socket.emit("typing", { room: currentRoomId, username: username });
    } else {
      socket.emit("stop_typing", { room: currentRoomId });
    }
  }}
  onBlur={() => {
    // Clear indicator when user clicks away from the box
    socket.emit("stop_typing", { room: currentRoomId });
  }}
  onKeyPress={(e) => { e.key === "Enter" && sendMessage(); }}
  style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
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