require('dotenv').config()

const { pick, assign, transform, camelCase } = require('lodash')
const axios = require('axios')
const qs = require('qs')
const ms = require('ms')
const micro = require('micro')
const { router, get } = require('microrouter')
const scores = require('./lib/scores')
const Logger = require('./lib/logger')

const DEFAULT_EMOJI = 'baseball'

const camelCaseKeys = (obj) => transform(obj, (res, value, key) => (res[camelCase(key)] = value), {})

const setStatus = ({ status, emoji, token }, { retry = false } = {}) => {
  const profile = { status_text: status, status_emoji: `:${emoji}:` }
  const url = `https://slack.com/api/users.profile.set?${qs.stringify({token, profile: JSON.stringify(profile)})}`

  return axios.post(url).then(({ data }) => {
    if (!data.ok) {
      if (data.error === 'profile_status_set_failed_not_valid_emoji' && !retry) {
        return setStatus({ status, token, emoji: DEFAULT_EMOJI }, { retry: true })
      }

      throw new Error(data.error)
    }

    return {
      ok: data.ok,
      profile: pick(data.profile, 'status_text', 'status_emoji')
    }
  })
}

const start = (options) => {
  const {
    token,
    url,
    team,
    emoji = DEFAULT_EMOJI,
    interval = '5m',
    tz = 'America/Los_Angeles',
    dayOffset = '3h',
    port = 3005,
    nullLogger = false
  } = assign(
    camelCaseKeys(pick(process.env, ['TOKEN', 'URL', 'TEAM', 'EMOJI', 'INTERVAL', 'TZ', 'DAY_OFFSET', 'PORT'])),
    options
  )

  let lastEvent = null
  const logger = new Logger({ max: 100, logger: nullLogger ? null : void 0 })

  const watcher = scores(
    team,
    {
      logger,
      url,
      interval,
      timezone: tz,
      dailyCutoff: Math.round(ms(dayOffset) / 1000 / 60) // minutes
    },
    (err, status) => (err ? Promise.reject(err) : setStatus({ status, emoji, token }))
      .then((resp) => (logger.log(JSON.stringify(resp)), resp)) // eslint-disable-line no-sequences
      .catch((err) => (logger.error(err), err)) // eslint-disable-line no-sequences
      .then((e) => (lastEvent = e))
  )

  const send = (res, data) => {
    const code = data instanceof Error ? 500 : 200
    const resp = data instanceof Error ? `${data.message}\n${data.stack}` : data
    const type = typeof resp === 'string' ? 'text/plain' : 'application/json'
    res.setHeader('Content-Type', `${type}; charset=utf-8`)
    micro.send(res, code, resp)
  }

  const server = micro(router(
    get('/', (req, res) => send(res, lastEvent || logger.toString())),
    get('/logs', (req, res) => send(res, logger.toString()))
  ))

  watcher.start()
  server.listen(port)

  return {
    get: () => ({ logs: logger.logs(), last: lastEvent }),
    close: () => {
      watcher.stop()
      server.close()
    }
  }
}

if (require.main === module) {
  start()
} else {
  module.exports = start
}
