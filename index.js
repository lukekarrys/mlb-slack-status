require('dotenv').config()

const axios = require('axios')
const qs = require('qs')
const ms = require('ms')
const micro = require('micro')
const { router, get } = require('microrouter')
const scores = require('./lib/scores')
const Logger = require('./lib/logger')

const logger = new Logger({ max: 100, logger: console })
const { TOKEN, URL, INTERVAL, TEAM, EMOJI, TZ, DAY_OFFSET, DRY } = process.env

const setStatus = (status) => {
  const profile = { status_text: status, status_emoji: `:${EMOJI}:` }
  const url = `https://slack.com/api/users.profile.set?${qs.stringify({token: TOKEN, profile: JSON.stringify(profile)})}`

  const req = DRY
    ? Promise.resolve()
    : axios.post(url)

  return req.then(() => profile)
}

const start = () => {
  const watcher = scores(
    TEAM,
    {
      logger,
      timezone: TZ,
      dailyCutoff: Math.round(ms(DAY_OFFSET) / 1000 / 60), // minutes
      interval: INTERVAL,
      url: URL
    },
    (err, status) => {
      if (err) return logger.error(err)
      setStatus(status)
        .then((resp) => logger.log('[STATUS]', JSON.stringify(resp)))
        .catch((err) => logger.error(err))
    }
  )

  const server = micro(router(
    get('/', (req, res) => micro.send(res, 200, logger.toString()))
  ))

  watcher.start()
  server.listen(3000)
}

start()
