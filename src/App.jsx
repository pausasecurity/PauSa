import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { VerificationProvider, useVerification } from './context/VerificationContext'
import VerificationBanner from './components/VerificationBanner'
import Navbar from './components/Navbar'
import LoginModal from './components/LoginModal'
import Toast from './components/Toast'
import OnboardingModal from './components/OnboardingModal'
import GroupCard from './components/GroupCard'
import GroupDetail from './components/GroupDetail'
import CreateGroupModal from './components/CreateGroupModal'
import CreateLobbyModal from './components/CreateLobbyModal'
import FriendsList from './components/FriendsList'
import LobbyCard from './components/LobbyCard'
import LobbyDetail from './components/LobbyDetail'
import LobbyChat from './components/LobbyChat'
import FilterPanel, { DEFAULT_FILTERS } from './components/FilterPanel'
import MessagesPanel from './components/MessagesPanel'
import Hero from './components/Hero'
import BottomNav from './components/BottomNav'
import KontoTab from './components/KontoTab'
import ErrorBoundary from './components/ErrorBoundary'
import { getAllGroups, GAME_CATEGORIES } from './services/groupService'
import { subscribeToLobbies, joinLobby, getUserLobby, seedIfEmpty, findLobbyByCode } from './services/lobbyService'
import { loadProfile } from './services/profileService'
import { getAverageRating, getRatingsFor } from './services/ratingService'
import { PLATFORM_META } from './data/constants'
import { GAMES } from './data/games'



const RANK_ORDER = ['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Radiant']

// --- MODULE: LFG_FEED ---
const LfgFeed = ({ filters = DEFAULT_FILTERS, onLobbiesChange, onOpenLobby }) => {
  const { currentUser }    = useAuth()
  const { age }            = useVerification()
  const [lobbies, setLobbies]   = React.useState([])
  const [err, setErr]           = React.useState(null)
  const [codeInput, setCodeInput] = React.useState('')
  const [codeErr, setCodeErr]   = React.useState(null)
  const [codeLoading, setCodeLoading] = React.useState(false)

  React.useEffect(() => {
    return subscribeToLobbies(fresh => {
      setLobbies(fresh)
      onLobbiesChange?.(fresh)
    })
  }, [])

  const visible = React.useMemo(() => {
    let result = lobbies

    if (filters.game !== 'Alle')
      result = result.filter(l => l.game === filters.game)

    if (filters.platform !== 'any')
      result = result.filter(l => !l.platform || l.platform === filters.platform || l.platform === 'crossplay')

    if (filters.region !== 'any')
      result = result.filter(l => !l.region || l.region === filters.region)

    if (filters.gender !== 'any')
      result = result.filter(l => !l.gender || l.gender === filters.gender)

    if (filters.mode !== 'any')
      result = result.filter(l => !l.mode || l.mode === filters.mode)

    if (filters.ageRange !== 'any') {
      const min = parseInt(filters.ageRange, 10)
      result = result.filter(l => !l.minAge || l.minAge >= min)
    }

    if (filters.language !== 'any')
      result = result.filter(l => l.language === filters.language || l.language === 'any')

    if (filters.mic === 'yes') result = result.filter(l => l.requiresMic)
    if (filters.mic === 'no')  result = result.filter(l => !l.requiresMic)

    if (filters.rank !== 'any') {
      const minIdx = RANK_ORDER.indexOf(filters.rank)
      result = result.filter(l => {
        if (!l.minRank || l.minRank === 'Keine') return false
        return RANK_ORDER.indexOf(l.minRank) >= minIdx
      })
    }

    // Age gating — basierend auf games.js ageRating
    if (age !== null) {
      result = result.filter(l => {
        const game = GAMES.find(g => g.label === l.game)
        const rating = game?.ageRating ?? 0
        if (rating >= 18 && age < 18) return false
        if (rating >= 16 && age < 16) return false
        return true
      })
    }

    return result
  }, [lobbies, filters, age])

  const handleJoin = async (e, lobbyId) => {
    e.stopPropagation()
    if (!currentUser) { setErr('Einloggen, um einer Lobby beizutreten.'); return }
    setErr(null)
    try {
      await joinLobby(lobbyId, currentUser)
    } catch (e) {
      setErr(e.message)
    }
  }

  const hasFilters = Object.entries(filters).some(([k, v]) => k === 'game' ? v !== 'Alle' : v !== 'any')

  const handleJoinByCode = async () => {
    const code = codeInput.trim().toUpperCase()
    if (code.length !== 4) { setCodeErr('4-stelligen Code eingeben.'); return }
    setCodeErr(null)
    setCodeLoading(true)
    try {
      const lobby = await findLobbyByCode(code)
      if (!lobby) { setCodeErr('Kein Lobby mit diesem Code gefunden.'); return }
      onOpenLobby(lobby)
      setCodeInput('')
    } catch {
      setCodeErr('Fehler beim Suchen. Bitte erneut versuchen.')
    } finally {
      setCodeLoading(false)
    }
  }

  return (
    <section className="px-6 py-8">
      {/* Code-Eingabe */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={e => { setCodeInput(e.target.value.toUpperCase().slice(0, 4)); setCodeErr(null) }}
            onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
            placeholder="Code eingeben (z. B. K7QP)"
            maxLength={4}
            className="flex-1 bg-brand-card border border-gray-800 focus:border-brand-primary rounded-lg px-4 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none tracking-widest uppercase"
          />
          <button
            onClick={handleJoinByCode}
            disabled={codeInput.length !== 4 || codeLoading}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-primary hover:bg-purple-500 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-600"
          >
            {codeLoading ? '…' : 'Öffnen'}
          </button>
        </div>
        {codeErr && <p className="text-xs text-red-400 mt-1.5">{codeErr}</p>}
      </div>

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-white">Offene Lobbys</h2>
        {hasFilters && (
          <span className="text-xs text-gray-500">{visible.length} Ergebnis{visible.length !== 1 ? 'se' : ''}</span>
        )}
      </div>
      {err && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2 mb-4 mt-2">
          {err}
        </p>
      )}
      {visible.length === 0 ? (
        <p className="text-center py-12" style={{ color: '#555555', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
          {hasFilters ? 'Keine Lobbys für diese Filter. Zurücksetzen oder eigene erstellen.' : 'Keine offenen Lobbys – erstelle die erste!'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <AnimatePresence>
            {visible.map((lobby, i) => (
              <LobbyCard
                key={lobby.lobbyId}
                lobby={lobby}
                currentUser={currentUser}
                onOpen={onOpenLobby}
                onJoin={handleJoin}
                featured={i === 0}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}


// --- MODULE: USER_PROFILE ---
const RANK_COLORS = {
  'Bronze':  'from-amber-700 to-amber-900',
  'Silber':  'from-gray-400 to-gray-600',
  'Gold':    'from-yellow-400 to-yellow-600',
  'Platin':  'from-cyan-400 to-cyan-600',
  'Diamant': 'from-blue-400 to-purple-500',
  'Radiant': 'from-brand-primary to-brand-accent',
}

const RankBadge = ({ rank }) => (
  <span className={`bg-gradient-to-r ${RANK_COLORS[rank] ?? 'from-gray-600 to-gray-800'} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
    {rank}
  </span>
)

const StatRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-purple-900/20 last:border-0">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className="text-white text-xs font-semibold">{value}</span>
  </div>
)

const mockProfile = {
  username: 'ShadowWolf_99',
  tagline: '#EUW',
  avatar: null,
  mainGames: ['Valorant', 'CS2'],
  rank: 'Platin',
  stats: {
    'Partien gespielt': 342,
    'Win Rate': '54%',
    'KD-Ratio': '1.38',
    'Bewertung': '4.7 / 5.0',
  },
  socialLinks: {
    steam:    { id: 'ShadowWolf99' },
    epic:     { id: 'ShadowWolf_99' },
    psn:      { id: null },
    xbox:     { id: null },
    nintendo: { id: null },
  },
  ready: false,
}

function StarDisplay({ value, max = 5 }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < Math.round(value) ? 'text-yellow-400' : 'text-gray-700'}>★</span>
      ))}
    </span>
  )
}

const UserProfile = ({ variant = 'sidebar' }) => {
  const rawProfile = loadProfile()
  const { currentUser } = useAuth()

  const profile = rawProfile ? {
    username:    rawProfile.username,
    tagline:     '#PauSa',
    avatar:      null,
    mainGames:   (rawProfile.favoriteGames ?? [])
                   .map(id => GAMES.find(g => g.id === id)?.label)
                   .filter(Boolean)
                   .slice(0, 3),
    rank:        'Unranked',
    stats:       { 'Partien gespielt': '–', 'Win Rate': '–', 'KD-Ratio': '–' },
    socialLinks: rawProfile.socialLinks ?? {},
    ready:       false,
  } : currentUser ? {
    username:    currentUser.username,
    tagline:     '#PauSa',
    avatar:      null,
    mainGames:   [],
    rank:        'Unranked',
    stats:       { 'Partien gespielt': '–', 'Win Rate': '–', 'KD-Ratio': '–' },
    socialLinks: {},
    ready:       false,
  } : mockProfile

  const [activeTab, setActiveTab] = React.useState('stats')
  const { age, unlocked, verificationRequired } = useVerification()

  const userId = rawProfile?.userId ?? currentUser?.userId ?? null
  const [ratingData,    setRatingData]    = React.useState({ avg: null, count: 0 })
  const [recentRatings, setRecentRatings] = React.useState([])

  React.useEffect(() => {
    if (!userId) return
    getAverageRating(userId).then(setRatingData).catch(() => {})
    getRatingsFor(userId)
      .then(r => setRecentRatings(r.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10)))
      .catch(() => {})
  }, [userId])

  const { avg, count } = ratingData

  const wrapperClass = variant === 'page'
    ? 'w-full max-w-2xl mx-auto px-6 py-10'
    : 'hidden lg:block w-72 bg-brand-surface border-l border-purple-900/30 p-5 shrink-0'

  return (
    <aside className={wrapperClass}>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Dein Profil</p>

      <div className="bg-brand-card rounded-xl p-4 text-center mb-4">
        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-2xl font-bold text-white select-none mx-auto">
            {profile.username[0]}
          </div>
          <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-brand-card ${profile.ready ? 'bg-brand-accent' : 'bg-gray-600'}`} />
        </div>
        <p className="font-bold text-white leading-tight">{profile.username}</p>
        <p className="text-gray-500 text-xs">{profile.tagline}</p>
        <div className="flex justify-center mt-2">
          <RankBadge rank={profile.rank} />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Hauptspiele</p>
        <div className="flex flex-wrap gap-2">
          {profile.mainGames.map(g => (
            <span key={g} className="text-xs bg-purple-900/40 border border-purple-700/40 text-gray-300 px-2 py-1 rounded-lg">
              {g}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-brand-dark rounded-lg p-1 mb-4">
        {[
          { key: 'stats',       label: 'Stats'   },
          { key: 'konten',      label: 'Konten'  },
          { key: 'bewertungen', label: 'Reviews' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === key
                ? 'bg-brand-primary text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && (
        <div className="bg-brand-card rounded-xl p-3">
          {Object.entries(profile.stats).map(([label, value]) => (
            <StatRow key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {activeTab === 'konten' && (
        <div className="bg-brand-card rounded-xl p-3 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Verknüpfte Konten</p>
          {Object.entries(profile.socialLinks).map(([platform, entry]) => {
            const meta = PLATFORM_META[platform]
            if (!meta) return null
            const id = typeof entry === 'object' ? entry?.id : entry
            return (
              <div
                key={platform}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${meta.color}`}
              >
                <span className="text-xs font-semibold">{meta.label}</span>
                {id ? (
                  <span className="text-xs font-mono text-white/80 truncate max-w-[120px]">{id}</span>
                ) : (
                  <span className="text-xs text-gray-600 italic">nicht verknüpft</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'bewertungen' && (
        <div className="bg-brand-card rounded-xl p-4 space-y-3">
          {/* Durchschnitt */}
          <div className="flex items-center gap-3 pb-3 border-b border-purple-900/20">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{avg !== null ? avg.toFixed(1) : '–'}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{count} Bewertung{count !== 1 ? 'en' : ''}</p>
            </div>
            <div>
              {avg !== null
                ? <StarDisplay value={avg} />
                : <p className="text-xs text-gray-600 italic">Noch keine Bewertungen</p>
              }
            </div>
          </div>

          {/* Einzelne Bewertungen */}
          {recentRatings.length === 0 ? (
            <p className="text-xs text-gray-600 italic text-center py-2">
              Noch keine Bewertungen erhalten.
            </p>
          ) : (
            <div className="space-y-2.5">
              {recentRatings.map((r, i) => (
                <div key={i} className="bg-brand-dark/50 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <StarDisplay value={r.stars} />
                    <span className="text-[10px] text-gray-600">{new Date(r.at).toLocaleDateString('de-DE')}</span>
                  </div>
                  {r.comment && (
                    <p className="text-xs text-gray-400 leading-snug">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs flex items-center gap-2 ${
        unlocked
          ? 'border-brand-accent/40 text-brand-accent bg-brand-accent/5'
          : verificationRequired
            ? 'border-yellow-600/50 text-yellow-400 bg-yellow-900/10'
            : 'border-gray-700/40 text-gray-600'
      }`}>
        <span>{unlocked ? '✓' : verificationRequired ? '⚠' : '○'}</span>
        <span>
          {unlocked
            ? `Alter verifiziert (${age} J.) · 16+ freigeschaltet`
            : verificationRequired
              ? 'Verifizierung ausstehend'
              : age !== null ? `${age} J. · unter 16` : 'Kein Alter hinterlegt'}
        </span>
      </div>

    </aside>
  )
}

// --- MODULE: GROUP_FEED ---
const GroupFeed = () => {
  const { currentUser }             = useAuth()
  const { unlocked }                = useVerification()
  const [inLobby, setInLobby]       = useState(false)

  React.useEffect(() => {
    if (!currentUser) { setInLobby(false); return }
    getUserLobby(currentUser.userId).then(l => setInLobby(!!l))
  }, [currentUser])
  const [groups, setGroups]                 = useState(getAllGroups)
  const [activeCategory, setActiveCategory] = useState('all')
  const [detailGroup, setDetailGroup]       = useState(null)
  const [showCreate, setShowCreate]         = useState(false)

  const refresh = React.useCallback(() => setGroups(getAllGroups()), [])

  const sorted = React.useMemo(() => {
    const filtered = activeCategory === 'all'
      ? groups
      : groups.filter(g => g.category === activeCategory)
    return [...filtered].sort((a, b) =>
      a.type === 'clan' && b.type !== 'clan' ? -1 : b.type === 'clan' && a.type !== 'clan' ? 1 : 0
    )
  }, [groups, activeCategory])

  return (
    <section className="border-t border-purple-900/20">
      {!detailGroup && (
        <div className="px-6 py-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-white">Gruppen & Clans</h2>
              <p className="text-xs text-gray-500 mt-0.5">Dauerhafte Teams – Clans, Kampagnen, Gilden</p>
            </div>
            {!inLobby && (
              <button
                onClick={() => setShowCreate(true)}
                disabled={!unlocked}
                title={!unlocked ? 'Altersverifizierung erforderlich' : undefined}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                  unlocked ? 'bg-brand-primary hover:bg-purple-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {unlocked ? '+ Gründen' : '🔒 Gründen'}
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap mb-5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                activeCategory === 'all' ? 'border-brand-primary text-white bg-brand-primary/10' : 'border-purple-800/60 text-gray-500 hover:text-white'
              }`}
            >
              Alle
            </button>
            {Object.entries(GAME_CATEGORIES).map(([key, { label }]) => (
              <button key={key} onClick={() => setActiveCategory(key)}
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  activeCategory === key ? 'border-brand-primary text-white bg-brand-primary/10' : 'border-purple-800/60 text-gray-500 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {detailGroup ? (
        <GroupDetail
          group={groups.find(g => g.groupId === detailGroup.groupId)}
          onClose={() => setDetailGroup(null)}
          onUpdate={() => { refresh(); setDetailGroup(groups.find(g => g.groupId === detailGroup.groupId)) }}
        />
      ) : sorted.length > 0 ? (
        <div className="px-6 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(group => (
            <GroupCard
              key={group.groupId}
              group={group}
              onUpdate={refresh}
              onOpenDetail={setDetailGroup}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-8">Keine Einträge in dieser Kategorie.</p>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
        />
      )}
    </section>
  )
}

// --- MODULE: FOOTER ---
const Footer = () => (
  <footer className="bg-brand-surface border-t border-purple-900/30 px-6 py-8 text-center">
    <p className="text-sm text-gray-600">© 2026 PauSa – Find your Squad. All rights reserved.</p>
  </footer>
)

// ============================================================
// APP ROOT
// ============================================================
function AppShell() {
  const { isLoggedIn, currentUser } = useAuth()
  const [currentView, setCurrentView]       = useState('lobby')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showLogin, setShowLogin]           = useState(false)
  const [toast, setToast]                   = useState(null)
  const [filters, setFilters]               = useState(DEFAULT_FILTERS)
  const [allLobbies, setAllLobbies]         = useState([])
  const [activeLobby, setActiveLobby]       = useState(null)
  const [showCreateLobby, setShowCreateLobby] = useState(false)

  React.useEffect(() => { seedIfEmpty() }, [])

  const navigate = (view) => {
    setCurrentView(view)
    setActiveLobby(null)
  }

  return (
    <div className="min-h-screen bg-bg-950 flex flex-col">

      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      <VerificationBanner />

      {isLoggedIn && (
        <Navbar
          currentView={currentView}
          onNavigate={navigate}
          onLoginClick={() => setShowLogin(true)}
          onCreateLobby={() => setShowCreateLobby(true)}
        />
      )}

      <div className={`${isLoggedIn ? 'pt-20' : ''} pb-14 md:pb-0 flex flex-col flex-1`}>

        {/* ── VIEW: LOBBYS ── */}
        {currentView === 'lobby' && (
          <>
            <Hero
              onLoginClick={() => setShowLogin(true)}
              onRegisterClick={() => setShowOnboarding(true)}
            />
            {isLoggedIn && <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              lobbies={allLobbies}
            />}
            <div className="flex flex-1">
              <AnimatePresence mode="wait">
                {activeLobby ? (
                  <motion.div
                    key="detail"
                    className="flex-1 min-w-0"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <LobbyDetail
                      lobby={activeLobby}
                      onClose={() => setActiveLobby(null)}
                    />
                  </motion.div>
                ) : (
                  <motion.main
                    key="feed"
                    className="flex-1 min-w-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div id="lfg-feed">
                    {isLoggedIn && <LfgFeed
                      filters={filters}
                      onLobbiesChange={setAllLobbies}
                      onOpenLobby={setActiveLobby}
                    />}
                  </div>
                  </motion.main>
                )}
              </AnimatePresence>
              {isLoggedIn && (
                activeLobby
                  ? <LobbyChat lobbyId={activeLobby.lobbyId} currentUser={currentUser} />
                  : <MessagesPanel variant="sidebar" />
              )}
            </div>
          </>
        )}

        {/* ── VIEW: GRUPPEN ── */}
        {currentView === 'groups' && (
          <main className="flex-1">
            <GroupFeed />
          </main>
        )}

        {/* ── VIEW: MEIN PROFIL ── */}
        {currentView === 'profile' && (
          <main className="flex-1 bg-brand-dark">
            <UserProfile variant="page" />
          </main>
        )}

        {/* ── VIEW: FREUNDE ── */}
        {currentView === 'friends' && (
          <main className="flex-1 bg-brand-dark">
            <FriendsList />
          </main>
        )}

        {/* ── VIEW: KONTO ── */}
        {currentView === 'account' && (
          <main className="flex-1 bg-brand-dark">
            <KontoTab />
          </main>
        )}

      </div>

      <Footer />
      <MessagesPanel />
      <BottomNav currentView={currentView} onNavigate={navigate} />

      {showCreateLobby && (
        <CreateLobbyModal
          onClose={() => setShowCreateLobby(false)}
          onCreated={() => setShowCreateLobby(false)}
        />
      )}

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(profile) => setToast({ message: `Willkommen zurück, ${profile.username}!`, type: 'success' })}
          onRegister={() => setShowOnboarding(true)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <VerificationProvider>
          <AppShell />
        </VerificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
