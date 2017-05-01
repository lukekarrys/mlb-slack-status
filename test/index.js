const fs = require('fs')
const dotenv = require('dotenv')
const path = require('path')
const { each } = require('lodash')
const test = require('tape')
const MockDate = require('mockdate')
const nock = require('nock')

// Before importing start set the env vars to test stuff
each(dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.example'))), (value, key) => {
  process.env[key] = value
})

const start = require('../index')

test('it works', (t) => {
  const date = '2017-05-01T12:00:00.000Z'
  const status = `${process.env.TEAM} – 8:05 PM EDT vs PHI`
  const emoji = `:${process.env.EMOJI}:`

  MockDate.set(date)

  nock('http://www.espn.com')
    .get(`/mlb/scoreboard/_/date/${date.split('T')[0].replace(/-/g, '')}`)
    .reply(200, `<script>window.espn={scoreboardData:{events:${JSON.stringify(require('./fixture.json'))}}}</script>`)

  nock('https://slack.com')
    .post('/api/users.profile.set')
    .query({
      token: process.env.TOKEN,
      profile: JSON.stringify({ status_text: status, status_emoji: emoji })
    })
    .reply(200, {
      ok: true,
      profile: { status_text: status, status_emoji: emoji }
    })

  const server = start({ nullLogger: true })

  setTimeout(() => {
    const data = server.get()

    const resp = {
      ok: true,
      profile: { status_text: status, status_emoji: emoji }
    }

    t.equal(data.logs.length, 6)
    t.equal(data.logs[5], `${date} [LOG] ${JSON.stringify(resp)}`)
    t.deepEqual(data.last, resp)

    server.close()
    t.end()
  }, 2000)
})
