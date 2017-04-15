require('dotenv').config()

const axios = require('axios')
const qs = require('qs')
const scores = require('./lib/scores')
const teams = require('./lib/teams')

const { TOKEN, INTERVAL, TEAM, LOGS_SECRET } = process.env

if (!teams.includes(TEAM)) {
  throw new Error(`process.env.TEAM must be one of ${teams.join(',')}`)
}

if (LOGS_SECRET) {
  require('now-logs')(LOGS_SECRET)
}

const setStatus = (status, token) => axios({
  method: 'post',
  url: `https://slack.com/api/users.profile.set?${qs.stringify({
    token,
    profile: JSON.stringify({ status_text: status, status_emoji: `:${TEAM.toLowerCase()}:` })
  })}`
})

const logger = {
  log: console.log.bind(console),
  info: console.log.bind(console),
  error: console.error.bind(console),
  debug: () => {}
}

scores(
  TEAM,
  { interval: INTERVAL, logger },
  (status) => status && setStatus(status, TOKEN)
    .then(() => logger.log('[STATUS_SUCCESS]', status))
    .catch((err) => logger.error('[STATUS_ERROR]', err.message))
)
