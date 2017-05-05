// const fs = require('fs')
// const dotenv = require('dotenv')
// const path = require('path')
// const { each } = require('lodash')
const test = require('tape')
const MockDate = require('mockdate')
const nock = require('nock')
const Url = require('url')

const start = require('../index')

const expectedStatus = (t, { url, team, date, status, emoji, token, fixture }) => {
  const statusObj = { status_text: status, status_emoji: `:${emoji}:` }

  MockDate.reset()
  MockDate.set(date)

  const dataUrl = Url.parse(url)
  const dataHost = `${dataUrl.protocol}//${dataUrl.host}`
  const urlDate = date.split('T')[0].replace(/-/g, '')
  const dataPath = `${dataUrl.pathname.split('/').slice(0, -1).join('/')}/${urlDate}`

  nock(dataHost)
    .get(dataPath)
    .reply(200, `<script>window.espn={scoreboardData:{events:${JSON.stringify(fixture)}}}</script>`)

  nock('https://slack.com')
    .post('/api/users.profile.set')
    .query({ token, profile: JSON.stringify(statusObj) })
    .reply(200, { ok: true, profile: statusObj })

  const server = start({
    team,
    url,
    token,
    emoji,
    nullLogger: true
  })

  setTimeout(() => {
    const data = server.get()

    const resp = { ok: true, profile: statusObj }

    t.equal(data.logs.length, 6)
    t.equal(data.logs[5], `${date} [LOG] ${JSON.stringify(resp)}`)
    t.deepEqual(data.last, resp)

    server.close()
    t.end()
  }, 500)
}

test('it works for the cubs before the game has started', (t) => expectedStatus(t, {
  token: 'NOT_A_REAL_TOKEN',
  team: 'CHC',
  emoji: 'chc',
  status: 'CHC – 8:05 PM EDT vs PHI',
  url: 'http://www.espn.com/mlb/scoreboard/_/date/{date}',
  date: '2017-05-01T12:00:00.000Z',
  fixture: require('./mlb-2017-05-01.json')
}))

test('it works for the cubs after the game has ended', (t) => expectedStatus(t, {
  token: 'NOT_A_REAL_TOKEN',
  team: 'CHC',
  emoji: 'chc',
  status: 'CHC – W 5 - 4 F/13 vs PHI',
  url: 'http://www.espn.com/mlb/scoreboard/_/date/{date}',
  date: '2017-05-04T16:34:36.000Z',
  fixture: require('./mlb-2017-05-04.json')
}))

test('it works for the rockies who have an in progress game', (t) => expectedStatus(t, {
  token: 'NOT_A_REAL_TOKEN',
  team: 'COL',
  emoji: 'baseball',
  status: 'COL – 2 - 2 Top 11th 1 out @ SD',
  url: 'http://www.espn.com/mlb/scoreboard/_/date/{date}',
  date: '2017-05-04T16:34:36.000Z',
  fixture: require('./mlb-2017-05-04.json')
}))

test('it works for the nba cavs who won', (t) => expectedStatus(t, {
  token: 'NOT_A_REAL_TOKEN',
  team: 'CLE',
  emoji: 'basketball',
  status: 'CLE – W 125 - 103 vs TOR',
  url: 'http://www.espn.com/nba/scoreboard/_/date/{date}',
  date: '2017-05-03T16:34:36.000Z',
  fixture: require('./nba-2017-05-03.json')
}))

test('it works for the nba celtics in progress', (t) => expectedStatus(t, {
  token: 'NOT_A_REAL_TOKEN',
  team: 'BOS',
  emoji: 'basketball',
  status: 'BOS – 2 - 7 10:14 1st @ WSH',
  url: 'http://www.espn.com/nba/scoreboard/_/date/{date}',
  date: '2017-05-04T16:34:36.000Z',
  fixture: require('./nba-2017-05-04.json')
}))

test('it works for the nba celtics winning in OT', (t) => expectedStatus(t, {
  token: 'NOT_A_REAL_TOKEN',
  team: 'BOS',
  emoji: 'basketball',
  status: 'BOS – W 129 - 119 F/OT vs WSH',
  url: 'http://www.espn.com/nba/scoreboard/_/date/{date}',
  date: '2017-05-02T16:34:36.000Z',
  fixture: require('./nba-2017-05-02.json')
}))
