import React, { useState, useEffect, useRef } from 'react'
import { Drawer } from 'vaul'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { getUserLobby, subscribeChat, sendMessage } from '../services/lobbyService'
import { getPendingInvitesForUser, acceptInvite, declineInvite } from '../services/groupService'
import { timeAgo } from '../utils/timeAgo'

const MOCK_MESSAGES = [
  { id: 'm1', type: 'clan',   from: 'NightHawk Esports',     text: 'Heute Abend 20 Uhr, alle ready?',  at: new Date(Date.now() - 10 * 60_000).toISOString() },
  { id: 'm2', type: 'group',  from: 'Die Vergessenen Lande', text: 'Nächste Session Samstag 18 Uhr.',   at: new Date(Date.now() - 35 * 60_000).toISOString() },
  { id: 'm3', type: 'invite', from: 'PixelQueen',  group: 'Diamond Push Squad', at: new Date(Date.now() - 60 * 60_000).toISOString() },
  { id: 'm4', type: 'invite', from: 'IronForge77', group: 'NightHawk Esports',  at: new Date(Date.now() - 3 * 60 * 60_000).toISOString() },
]

const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M2 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6l-4 3V5Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// Shared panel content used by both sidebar and drawer variants
function PanelContent({ currentUser }) {
  const { t } = useTranslation()
  const TABS = [
    { key: 'messages', label: t('messages.title')      },
    { key: 'lobby',    label: t('messages.lobbyChat')  },
    { key: 'invites',  label: t('messages.invitations') },
  ]
  const [activeTab, setActiveTab]     = useState('messages')
  const [inviteTick, setInviteTick]   = useState(0)
  const [activeLobby, setActiveLobby] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput]     = useState('')
  const [sending, setSending]         = useState(false)
  const chatEndRef                    = useRef(null)

  useEffect(() => {
    if (!currentUser) { setActiveLobby(null); return }
    getUserLobby(currentUser.userId).then(setActiveLobby)
  }, [currentUser])

  useEffect(() => {
    if (!activeLobby) { setChatMessages([]); return }
    return subscribeChat(activeLobby.lobbyId, setChatMessages)
  }, [activeLobby?.lobbyId])

  useEffect(() => {
    if (activeTab === 'lobby') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, activeTab])

  const handleSend = async () => {
    const text = chatInput.trim()
    if (!text || !currentUser || !activeLobby || sending) return
    setSending(true)
    setChatInput('')
    try { await sendMessage(activeLobby.lobbyId, currentUser, text) }
    finally { setSending(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const invites = currentUser ? getPendingInvitesForUser(currentUser.userId) : []

  const handleAccept = (invite) => {
    try { acceptInvite(invite.inviteId, currentUser.userId, currentUser.username) } catch {}
    setInviteTick(n => n + 1)
  }
  const handleDecline = (invite) => {
    try { declineInvite(invite.inviteId, currentUser.userId) } catch {}
    setInviteTick(n => n + 1)
  }

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #3F3F46', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px 0',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12, fontWeight: activeTab === tab.key ? 500 : 400,
              color: activeTab === tab.key ? '#FAFAFA' : '#A1A1AA',
              borderBottom: `2px solid ${activeTab === tab.key ? '#9B1631' : 'transparent'}`,
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'color 150ms ease-out, border-color 150ms ease-out',
              minHeight: 44,
            }}
          >
            {tab.label}
            {tab.key === 'invites' && invites.length > 0 && (
              <span style={{
                marginLeft: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#9B1631', borderRadius: '50%',
                width: 14, height: 14,
                fontSize: 9, fontWeight: 700, color: '#FAFAFA', verticalAlign: 'middle',
              }}>
                {invites.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>

        {activeTab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_MESSAGES.filter(m => m.type !== 'invite').map((msg, i) => (
              <div key={msg.id} style={{
                background: '#0E0E0F', border: '1px solid #3F3F46', borderRadius: 8,
                padding: '10px 12px',
                animation: `fadeUp 200ms ${i * 55}ms both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                    padding: '2px 8px', borderRadius: 4,
                    background: msg.type === 'clan' ? 'rgba(201,168,76,0.12)' : '#1A274440',
                    color:      msg.type === 'clan' ? '#C9A84C' : '#8BA3D4',
                  }}>
                    {msg.type === 'clan' ? t('messages.clan') : t('messages.group')}
                  </span>
                  <span style={{ color: '#555555', fontSize: 11, fontFamily: 'DM Sans, sans-serif', marginLeft: 'auto' }}>
                    {timeAgo(msg.at)}
                  </span>
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, color: '#A1A1AA', margin: '0 0 2px' }}>
                  {msg.from}
                </p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#71717A', margin: 0 }}>
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {!activeLobby ? (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#555555', textAlign: 'center', paddingTop: 32 }}>
                {t('messages.noLobby')}
              </p>
            ) : (
              <>
                <div style={{ background: '#0E0E0F', border: '1px solid #3F3F46', borderRadius: 8, padding: '8px 12px', marginBottom: 12, flexShrink: 0 }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#555555', margin: '0 0 2px' }}>{t('messages.activeLobby')}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#FAFAFA', margin: 0 }}>{activeLobby.title}</p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {chatMessages.length === 0 && (
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#555555', textAlign: 'center', paddingTop: 16 }}>
                      {t('messages.noMessages')}
                    </p>
                  )}
                  {chatMessages.map(msg => {
                    const isMe = currentUser && msg.userId === currentUser.userId
                    return (
                      <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #7C3AED, #9B1631)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 700, color: '#fff',
                        }}>
                          {msg.username[0]}
                        </div>
                        <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#A1A1AA' }}>
                              {isMe ? t('lobby.chatYou') : msg.username}
                            </span>
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: '#555555' }}>
                              {timeAgo(msg.at)}
                            </span>
                          </div>
                          <p style={{
                            fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: '2px 0 0',
                            padding: '6px 10px', borderRadius: 8, lineHeight: 1.4,
                            background: isMe ? 'rgba(155,22,49,0.2)' : '#0E0E0F',
                            color: isMe ? '#FAFAFA' : '#A1A1AA',
                            border: `1px solid ${isMe ? 'rgba(155,22,49,0.3)' : '#3F3F46'}`,
                          }}>
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder={t('lobby.chatPlaceholder')}
                    disabled={sending}
                    style={{
                      flex: 1, background: '#0E0E0F', border: '1px solid #3F3F46',
                      borderRadius: 8, padding: '8px 12px',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#FAFAFA',
                      outline: 'none', minHeight: 44, opacity: sending ? 0.5 : 1,
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!chatInput.trim() || sending}
                    style={{
                      padding: '0 14px', borderRadius: 8, minHeight: 44,
                      background: chatInput.trim() && !sending ? '#9B1631' : '#1A1A1C',
                      color: chatInput.trim() && !sending ? '#FAFAFA' : '#555555',
                      border: '1px solid #3F3F46',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
                      cursor: chatInput.trim() && !sending ? 'pointer' : 'not-allowed',
                      transition: 'background 150ms ease-out, color 150ms ease-out',
                      flexShrink: 0,
                    }}
                  >
                    →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invites.length === 0 ? (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#555555', textAlign: 'center', paddingTop: 32 }}>
                {t('messages.noInvitations')}
              </p>
            ) : invites.map(invite => (
              <div key={invite.inviteId} style={{ background: '#0E0E0F', border: '1px solid #3F3F46', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#555555', margin: '0 0 6px' }}>
                  {timeAgo(invite.sentAt)}
                </p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#A1A1AA', lineHeight: 1.5, margin: '0 0 10px' }}>
                  <span style={{ color: '#FAFAFA', fontWeight: 500 }}>{invite.fromUsername}</span>
                  {' '}{t('messages.invited')}{' '}
                  <span style={{ color: '#9B1631', fontWeight: 500 }}>{invite.groupName}</span>
                  {' '}{t('messages.invitedSuffix')}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAccept(invite)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6, minHeight: 44,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
                      background: '#9B163118', color: '#9B1631', border: '1px solid #9B163155',
                      cursor: 'pointer', transition: 'background 150ms ease-out',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#9B163133'}
                    onMouseLeave={e => e.currentTarget.style.background = '#9B163118'}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                    onMouseUp={e =>   { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {t('common.accept')}
                  </button>
                  <button
                    onClick={() => handleDecline(invite)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6, minHeight: 44,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
                      background: 'transparent', color: '#A1A1AA', border: '1px solid #3F3F46',
                      cursor: 'pointer', transition: 'color 150ms ease-out, border-color 150ms ease-out',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#FAFAFA'; e.currentTarget.style.borderColor = '#71717A' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.borderColor = '#3F3F46' }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                    onMouseUp={e =>   { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {t('common.decline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  )
}

export default function MessagesPanel({ variant = 'drawer' }) {
  const { t } = useTranslation()
  const { currentUser, isLoggedIn } = useAuth()
  const [open, setOpen] = useState(false)

  if (!isLoggedIn) return null

  // ── Sidebar variant (Desktop) ──
  if (variant === 'sidebar') {
    return (
      <aside className="hidden lg:flex flex-col w-72 bg-brand-surface border-l border-purple-900/30 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)]">
        <div style={{ padding: '20px 16px 12px', borderBottom: '0.5px solid #3F3F46', flexShrink: 0 }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500, color: '#71717A', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            {t('messages.title')}
          </p>
        </div>
        <PanelContent currentUser={currentUser} />
      </aside>
    )
  }

  // ── Drawer variant (Mobile) ──
  const invites     = currentUser ? getPendingInvitesForUser(currentUser.userId) : []
  const unreadCount = invites.length

  return (
    <>
      {/* Trigger — hidden on lg (sidebar takes over) */}
      <div className="fixed bottom-6 right-6 z-[60] lg:hidden">
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={t('messages.openPanel')}
          className="relative flex items-center justify-center"
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: open ? '#9B1631' : '#1A1A1C',
            border: open ? 'none' : '1px solid #3F3F46',
            color: '#FAFAFA',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'background 150ms ease-out, border-color 150ms ease-out, transform 100ms ease-out',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = '#9B1631' }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = '#3F3F46' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
          onMouseUp={e =>   { e.currentTarget.style.transform = 'scale(1)' }}
          onMouseOut={e =>  { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <ChatIcon />
          {!open && unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} ${t('messages.unread')}`}
              className="absolute -top-1 -right-1 flex items-center justify-center"
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#9B1631',
                fontSize: 9, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', color: '#FAFAFA',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,15,0.6)', zIndex: 54 }} />
          <Drawer.Content
            aria-label={t('messages.title')}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              zIndex: 55, maxHeight: '82vh',
              background: '#1A1A1C',
              borderTop: '0.5px solid #3F3F46',
              borderRadius: '10px 10px 0 0',
              display: 'flex', flexDirection: 'column',
              outline: 'none',
            }}
          >
            <div aria-hidden style={{ width: 40, height: 4, borderRadius: 2, background: '#3F3F46', margin: '12px auto 0', flexShrink: 0 }} />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '0.5px solid #3F3F46', flexShrink: 0,
            }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#FAFAFA', margin: 0 }}>
                {t('messages.title')}
              </p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                style={{
                  color: '#71717A', minHeight: 44, minWidth: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 120ms ease-out',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#FAFAFA'}
                onMouseLeave={e => e.currentTarget.style.color = '#71717A'}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                onMouseUp={e =>   { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <CloseIcon />
              </button>
            </div>
            <PanelContent currentUser={currentUser} />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
