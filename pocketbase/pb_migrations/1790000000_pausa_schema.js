/// <reference path="../pb_data/types.d.ts" />

const AUTH = '@request.auth.id != ""'

migrate((app) => {
  // --- users (Auth-Collection erweitern) ---
  const users = app.findCollectionByNameOrId('users')
  users.fields.add(new TextField({ name: 'username', max: 30 }))
  users.fields.add(new TextField({ name: 'usernameLower', max: 30 }))
  users.fields.add(new JSONField({ name: 'socialLinks', maxSize: 2000 }))
  users.fields.add(new JSONField({ name: 'favoriteGames', maxSize: 5000 }))
  users.listRule   = AUTH
  users.viewRule   = AUTH
  users.updateRule = 'id = @request.auth.id'
  users.deleteRule = 'id = @request.auth.id'
  users.addIndex('idx_users_usernameLower', false, 'usernameLower', '')
  app.save(users)

  // --- lobbies ---
  const lobbies = new Collection({
    type: 'base',
    name: 'lobbies',
    listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
      { type: 'text',   name: 'game',         max: 50, required: true },
      { type: 'text',   name: 'gameCategory', max: 30 },
      { type: 'text',   name: 'title',        max: 80, required: true },
      { type: 'text',   name: 'description',  max: 200 },
      { type: 'number', name: 'maxSlots',     min: 2, max: 10, onlyInt: true },
      { type: 'bool',   name: 'requiresMic' },
      { type: 'text',   name: 'language',     max: 5 },
      { type: 'text',   name: 'minRank',      max: 20 },
      { type: 'text',   name: 'platform',     max: 20 },
      { type: 'text',   name: 'region',       max: 5 },
      { type: 'text',   name: 'mode',         max: 20 },
      { type: 'text',   name: 'gender',       max: 10 },
      { type: 'number', name: 'minAge',       min: 0, max: 99, onlyInt: true },
      { type: 'json',   name: 'members',      maxSize: 5000 },
      { type: 'json',   name: 'createdBy',    maxSize: 500 },
      { type: 'text',   name: 'joinCode',     max: 4 },
      { type: 'text',   name: 'createdAt',    max: 30 },
      { type: 'text',   name: 'expiresAt',    max: 30 },
      { type: 'text',   name: 'allReadyAt',   max: 30 },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE INDEX idx_lobbies_joinCode ON lobbies (joinCode)',
      'CREATE INDEX idx_lobbies_expiresAt ON lobbies (expiresAt)',
    ],
  })
  app.save(lobbies)

  // --- lobby_messages (ersetzt Subcollection lobbies/{id}/messages) ---
  app.save(new Collection({
    type: 'base',
    name: 'lobby_messages',
    listRule: AUTH, viewRule: AUTH,
    createRule: AUTH + ' && @request.body.userId = @request.auth.id',
    updateRule: null, deleteRule: null,
    fields: [
      { type: 'relation', name: 'lobby', collectionId: lobbies.id, cascadeDelete: true, maxSelect: 1, required: true },
      { type: 'text', name: 'userId',   max: 30, required: true },
      { type: 'text', name: 'username', max: 30 },
      { type: 'text', name: 'text',     max: 300, required: true },
      { type: 'text', name: 'at',       max: 30 },
    ],
    indexes: ['CREATE INDEX idx_msg_lobby_at ON lobby_messages (lobby, at)'],
  }))

  // --- friendships (userA < userB, Unique-Index ersetzt deterministische Doc-ID) ---
  const PARTY = '(@request.auth.id = userA || @request.auth.id = userB)'
  app.save(new Collection({
    type: 'base',
    name: 'friendships',
    listRule: PARTY, viewRule: PARTY, updateRule: PARTY, deleteRule: PARTY,
    createRule: AUTH + ' && @request.body.from = @request.auth.id'
      + ' && (@request.body.userA = @request.auth.id || @request.body.userB = @request.auth.id)',
    fields: [
      { type: 'text', name: 'userA',        max: 30, required: true },
      { type: 'text', name: 'userB',        max: 30, required: true },
      { type: 'text', name: 'from',         max: 30, required: true },
      { type: 'text', name: 'to',           max: 30, required: true },
      { type: 'text', name: 'fromUsername', max: 30 },
      { type: 'text', name: 'toUsername',   max: 30 },
      { type: 'select', name: 'status', values: ['pending', 'accepted'], maxSelect: 1, required: true },
      { type: 'text', name: 'createdAt',    max: 30 },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_friend_pair ON friendships (userA, userB)',
      'CREATE INDEX idx_friend_from ON friendships ("from")',
      'CREATE INDEX idx_friend_to ON friendships ("to")',
    ],
  }))

  // --- ratings (unveränderbar nach Erstellung) ---
  app.save(new Collection({
    type: 'base',
    name: 'ratings',
    listRule: AUTH, viewRule: AUTH,
    createRule: AUTH + ' && @request.body.raterId = @request.auth.id',
    updateRule: null, deleteRule: null,
    fields: [
      { type: 'text',   name: 'lobbyId',        max: 30, required: true },
      { type: 'text',   name: 'raterId',        max: 30, required: true },
      { type: 'text',   name: 'targetId',       max: 30, required: true },
      { type: 'text',   name: 'targetUsername', max: 30 },
      { type: 'number', name: 'stars',          min: 1, max: 5, onlyInt: true, required: true },
      { type: 'text',   name: 'comment',        max: 500 },
      { type: 'text',   name: 'at',             max: 30 },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_rating_unique ON ratings (lobbyId, raterId, targetId)',
      'CREATE INDEX idx_rating_target ON ratings (targetId)',
    ],
  }))

  // --- loginHistory (nur Server/Hooks, alle Client-Rules gesperrt) ---
  app.save(new Collection({
    type: 'base',
    name: 'loginHistory',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: 'text',   name: 'user',    max: 30, required: true },
      { type: 'text',   name: 'ip',      max: 64 },
      { type: 'text',   name: 'city',    max: 80 },
      { type: 'text',   name: 'country', max: 80 },
      { type: 'number', name: 'loginAt', onlyInt: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_loginhistory_user ON loginHistory (user)'],
  }))
}, (app) => {
  for (const name of ['loginHistory', 'ratings', 'friendships', 'lobby_messages', 'lobbies']) {
    try { app.delete(app.findCollectionByNameOrId(name)) } catch (_) {}
  }
  const users = app.findCollectionByNameOrId('users')
  for (const f of ['username', 'usernameLower', 'socialLinks', 'favoriteGames']) users.fields.removeByName(f)
  users.removeIndex('idx_users_usernameLower')
  users.listRule = 'id = @request.auth.id'
  users.viewRule = 'id = @request.auth.id'
  app.save(users)
})
