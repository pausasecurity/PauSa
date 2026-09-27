import React, { useState, useEffect, useRef } from 'react'
import { subscribeChat, sendMessage, subscribeLobby } from '../services/lobbyService'
import ReportModal from './ReportModal'
import { timeAgo } from '../utils/timeAgo'
import { useTranslation } from 'react-i18next'

export default function LobbyChat({ lobbyId, currentUser }) {
  const { t } = useTranslation()
  const [isMember, setIsMember]         = useState(false)
  const [chatInput, setChatInput]       = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [sending, setSending]           = useState(false)
  const [sendError, setSendError]       = useState(null)
  const [hoveredMsg, setHoveredMsg]     = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const chatContainerRef                = useRef(null)

  useEffect(() => {
    return subscribeLobby(lobbyId, lobby => {
      if (!lobby || !currentUser) { setIsMember(false); return }
      setIsMember(lobby.members.some(m => m.userId === currentUser.userId))
    })
  }, [lobbyId, currentUser])

  useEffect(() => {
    if (!isMember) { setChatMessages([]); return }
    return subscribeChat(lobbyId, setChatMessages)
  }, [isMember, lobbyId])

  useEffect(() => {
    const el = chatContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMessages])

  const handleSend = async () => {
    const text = chatInput.trim()
    if (!text || !currentUser || sending) return
    setSending(true)
    setSendError(null)
    setChatInput('')
    try {
      await sendMessage(lobbyId, currentUser, text)
    } catch {
      setSendError('Nachricht konnte nicht gesendet werden.')
      setChatInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleChatKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <>
    <aside className="hidden lg:flex flex-col w-72 bg-brand-surface border-l border-purple-900/30 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)]">
      <div className="px-5 pt-5 pb-3 border-b border-purple-900/20">
        <p className="text-xs text-gray-500 uppercase tracking-widest">{t('lobby.chatTitle')}</p>
      </div>

      {!isMember ? (
        <div className="flex-1 flex items-center justify-center px-5">
          <p className="text-sm text-gray-600 text-center leading-relaxed">
            {t('lobby.chatLoginToSee')}
          </p>
        </div>
      ) : (
        <>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
            {chatMessages.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-6">{t('lobby.chatNoMessages')}</p>
            )}
            {chatMessages.map(msg => {
              const isMe = currentUser && msg.userId === currentUser.userId
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}
                  onMouseEnter={() => !isMe && setHoveredMsg(msg.id)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                    {msg.username[0]}
                  </div>
                  <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] font-semibold text-gray-400">{isMe ? t('lobby.chatYou') : msg.username}</span>
                      <span className="text-[10px] text-gray-700">{timeAgo(msg.at)}</span>
                    </div>
                    <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <p className={`text-xs px-2.5 py-1.5 rounded-xl leading-snug ${
                        isMe ? 'bg-brand-primary/30 text-white' : 'bg-brand-dark text-gray-300'
                      }`}>
                        {msg.text}
                      </p>
                      {!isMe && (
                        <button
                          onClick={() => setReportTarget({
                            type: 'message',
                            id:   msg.id,
                            name: `${msg.username}: „${msg.text.slice(0, 60)}${msg.text.length > 60 ? '…' : ''}"`,
                          })}
                          className={`text-[10px] text-gray-700 hover:text-red-400 transition-all pb-1 ${
                            hoveredMsg === msg.id ? 'opacity-100' : 'opacity-0'
                          }`}
                          title="Nachricht melden"
                        >
                          ⚑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 pb-5 pt-3 border-t border-purple-900/20">
            {sendError && (
              <p className="text-[10px] text-red-400 mb-1.5">{sendError}</p>
            )}
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => { setChatInput(e.target.value); if (sendError) setSendError(null) }}
                onKeyDown={handleChatKey}
                placeholder={t('lobby.chatPlaceholder')}
                disabled={sending}
                className="flex-1 bg-brand-dark border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary disabled:opacity-50"
              />
              <button
                disabled={!chatInput.trim() || sending}
                onClick={handleSend}
                className="px-3 py-2 rounded-lg text-sm bg-brand-primary hover:bg-purple-500 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-600"
              >
                ↑
              </button>
            </div>
          </div>
        </>
      )}
    </aside>

    {reportTarget && (
      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />
    )}
    </>
  )
}
