require('dotenv').config()

const { pick } = require('lodash')
const axios = require('axios')
const qs = require('qs')
const ms = require('ms')
const micro = require('micro')
const { router, get } = require('microrouter')
const scores = require('./lib/scores')
const Logger = require('./lib/logger')

const logger = new Logger({ max: 100, logger: console })
const { TOKEN, URL, INTERVAL, TEAM, EMOJI, TZ, DAY_OFFSET, DRY } = process.env
const DEFAULT_EMOJI = 'baseball'

const setStatus = (status, emoji, { retry = false } = {}) => {
  const profile = { status_text: status, status_emoji: `:${emoji}:` }
  const url = `https://slack.com/api/users.profile.set?${qs.stringify({token: TOKEN, profile: JSON.stringify(profile)})}`

  if (DRY) return Promise.resolve(profile)

  return axios.post(url).then(({ data }) => {
    if (!data.ok) {
      if (data.error === 'profile_status_set_failed_not_valid_emoji' && !retry) {
        return setStatus(status, DEFAULT_EMOJI, { retry: true })
      }

      throw new Error(data.error)
    }

    return {
      ok: data.ok,
      profile: pick(data.profile, 'status_text', 'status_emoji')
    }
  })
}

const start = () => {
  let lastEvent = null

  const watcher = scores(
    TEAM,
    {
      logger,
      timezone: TZ,
      dailyCutoff: Math.round(ms(DAY_OFFSET) / 1000 / 60), // minutes
      interval: INTERVAL,
      url: URL
    },
    (err, status) => (err ? Promise.reject(err) : setStatus(status, EMOJI))
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
  server.listen(3000)
}

start()
