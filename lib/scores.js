const Scores = require('scores')
const _ = require('lodash')

const getStatus = (teamCode, {
  __raw: {
    status: {
      type: { state, shortDetail }
    },
    competitions: [{
      competitors: [team1, team2]
    }]
  }
}) => {
  const team = team1.team.abbreviation === teamCode ? team1 : team2
  const opponent = team === team1 ? team2 : team1
  const detail = shortDetail.replace(/^\d+\/\d+[\s-]+/, '')
  const vs = `${team.homeAway === 'home' ? 'vs' : '@'} ${opponent.team.abbreviation}`
  const score = `${team.score} - ${opponent.score}`

  switch (state) {
    case 'pre': return `${detail} ${vs}`
    case 'in': return `${score} ${detail} ${vs}`
    case 'post': return `${team.winner ? 'W' : 'L'} ${score} ${vs}`
  }
}

module.exports = (team, options, setStatus) => {
  const watcher = new Scores(Object.assign({
    completed: false,
    filter: (game) => game.home.abbrv === team || game.away.abbrv === team
  }, options))

  const prefix = (rest) => `${team} – ${rest}`

  watcher.on('event', (game) => {
    const status = _.attempt(getStatus, team, game)

    if (_.isError(status)) return setStatus(status)
    if (!status) return setStatus(new Error('No status could be found'))

    setStatus(null, prefix(status))
  })

  watcher.on('events', (games) => {
    if (games.length === 0) setStatus(null, prefix('No game today'))
  })

  return watcher
}
