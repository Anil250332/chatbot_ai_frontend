import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { io } from "socket.io-client";
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const [pendingBotCount, setPendingBotCount] = useState(0)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  useEffect(() => {
 
    socketRef.current = io("http://localhost:3000");
    const socketInstance = socketRef.current

    socketInstance.on('ai-response', (response) => {
      const text = (response && typeof response === 'object')
        ? (response.response ?? JSON.stringify(response))
        : String(response)

      const botMessage = {
        id: Date.now() + Math.random(),
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        sender: 'bot'
      }

      setMessages(prev => [...prev, botMessage])
      setPendingBotCount(prev => Math.max(0, prev - 1))
    })

    return () => {
      socketInstance.off('ai-response')
      socketInstance.disconnect()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (ev) => {
    if (ev) ev.preventDefault()
    const trimmed = inputText.trim()
    if (trimmed === '') return

    const userMessage = {
      id: Date.now(),
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      sender: 'user'
    }

    setMessages(prev => [...prev, userMessage])

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('ai-message', inputText)
      setPendingBotCount(prev => prev + 1)
    }

    setInputText('')
  }

  const handleInputChange = (e) => {
    setInputText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }

  const handleKeyDown = (e) => {
  
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const renderAvatar = (sender) => {
    if (sender === 'user') return <div className="avatar user">U</div>
    return <div className="avatar bot">AI</div>
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
           
            <div className="status">AI Chat</div>
          </div>
          <div className="header-right">
            <small>Your assistant</small>
          </div>
        </header>

        <main className="chat-messages" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>Start a conversation</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message-row ${message.sender === 'user' ? 'right' : 'left'}`}
              >
                {message.sender === 'bot' && renderAvatar('bot')}
                <div className="message-bubble">
                  <div className="message-text">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code({node, inline, className, children, ...props}) {
                          const languageClass = className || ''
                          if (inline) {
                            return (
                              <code className={`inline-code ${languageClass}`} {...props}>
                                {children}
                              </code>
                            )
                          }
                          return (
                            <pre className={`code-block ${languageClass}`}>
                              <code {...props}>{children}</code>
                            </pre>
                          )
                        }
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                  <div className="message-meta">
                    <span className="message-timestamp">{message.timestamp}</span>
                  </div>
                </div>
                {message.sender === 'user' && renderAvatar('user')}
              </div>
            ))
          )}
          {pendingBotCount > 0 && (
            <div className="message-row left" aria-live="polite" aria-label="Assistant is typing">
              {renderAvatar('bot')}
              <div className="message-bubble typing-bubble">
                <div className="typing-dots" role="status" aria-hidden="true">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <form className="chat-input" onSubmit={handleSendMessage}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="input-field"
          />
          <button
            type="submit"
            className="send-button"
            disabled={inputText.trim() === ''}
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
