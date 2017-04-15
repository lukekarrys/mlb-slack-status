const Scores = require('scores')
const _ = require('lodash')

const getStatus = (rootingTeam, game) => {
  const data = _.get(game, '__raw')

  const status = _.get(data, 'status')
  const state = _.get(status, 'type.state')
  const detail = _.get(status, 'type.shortDetail')

  const homeAway = (game.home.names.includes(rootingTeam) ? 'home' : 'away')
  const teams = _.get(game, '__raw.competitions[0].competitors')
  const [[team], [opponent]] = _.partition(teams, (t) => t.homeAway === homeAway)

  const rootingName = team.team.abbreviation
  const vs = `${team.homeAway === 'home' ? 'vs' : '@'} ${opponent.team.abbreviation}`
  const score = `${team.score} - ${opponent.score}`

  switch (state) {
    case 'pre':
      return `${rootingName} ${detail} ${vs}`

    case 'in':
      return `${rootingName} ${score} ${detail} ${vs}`

    case 'post':
      return `${rootingName} ${team.winner ? 'W' : 'L'} ${score} ${vs}`
  }
}

module.exports = (team, options, setStatus) => {
  const watcher = new Scores(Object.assign({
    url: `http://www.espn.com/mlb/scoreboard/_/date/{date}`,
    interval: '5m',
    completed: false,
    filter: (game) => game.home.abbrv === team || game.away.abbrv === team,
    timezone: 'America/New_York',
    dailyCutoff: 360
  }, options))

  watcher.on('event', (game) => setStatus(getStatus(team, game)))

  watcher.start()
}
