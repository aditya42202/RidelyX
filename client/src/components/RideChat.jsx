import { useEffect, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { api } from '../services/api'
import { onRideEvent } from '../services/socket'

export default function RideChat({ rideId }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !rideId) return undefined
    api.chatHistory(rideId).then((result) => setMessages(result.messages || [])).catch((requestError) => setError(requestError.message))
    api.markChatRead(rideId).catch(() => {})
    return onRideEvent('chat:message', (message) => setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]))
  }, [open, rideId])

  const send = async (event) => {
    event.preventDefault()
    if (!text.trim()) return
    try {
      const result = await api.sendChatMessage(rideId, text)
      setMessages((current) => [...current, result.message])
      setText('')
      setError('')
    } catch (requestError) { setError(requestError.message) }
  }

  return <div className="ride-chat"><button type="button" className="flow-action" onClick={() => setOpen(!open)}><MessageCircle size={16} /> {open ? 'Close chat' : 'Chat with driver'}</button>{open && <div className="ride-chat-panel"><div className="ride-chat-header"><strong>Chat with driver</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={16} /></button></div><div className="ride-chat-messages">{messages.length ? messages.map((message) => <div className="ride-chat-message" key={message._id}><span>{message.message}</span><small>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>) : <p>No messages yet.</p>}</div><form onSubmit={send}><input value={text} maxLength={2000} placeholder="Write a message" onChange={(event) => setText(event.target.value)} /><button type="submit" aria-label="Send message"><Send size={16} /></button></form>{error && <small role="alert">{error}</small>}</div>}</div>
}