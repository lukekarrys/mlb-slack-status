const Scores = require('scores')
const _ = require('lodash')

const singular = (val) => val.toString() === '1' ? '' : 's'

const getStatus = (teamCode, {
  __raw: {
    status: {
      type: { state, shortDetail }
    },
    competitions: [{
      situation: { outs = null } = {},
      competitors: [team1, team2]
    }]
  }
}) => {
  const team = team1.team.abbreviation === teamCode ? team1 : team2
  const opponent = team === team1 ? team2 : team1
  const vs = `${team.homeAway === 'home' ? 'vs' : '@'} ${opponent.team.abbreviation}`
  const score = `${team.score} - ${opponent.score}`
  let detail = shortDetail.replace(/^\d+\/\d+[\s-]+/, '').replace(/\s-\s/g, ' ')

  // Outs for baseball
  if (state === 'in' && outs != null) detail += ` ${outs} out${singular(outs)}`

  // If the postgame details is something more interesting than final (OT or extra innings)
  if (state === 'post') detail = detail === 'Final' ? '' : detail.replace('Final', 'F')

  switch (state) {
    case 'pre': return `${detail} ${vs}`
    case 'in': return `${score} ${detail} ${vs}`
    case 'post': return `${team.winner ? 'W' : 'L'} ${score} ${detail} ${vs}`
  }
}

module.exports = (team, options, setStatus) => {
  const watcher = new Scores(Object.assign({
    completed: false,
    filter: (game) => game.home.abbrv === team || game.away.abbrv === team
  }, options))

  // prefix team and collapse multiple spaces
  const output = (rest) => `${team} – ${rest}`.replace(/\s\s+/g, ' ')

  watcher.on('event', (game) => {
    const status = _.attempt(getStatus, team, game)

    if (_.isError(status)) return setStatus(status)
    if (!status) return setStatus(new Error('No status could be found'))

    setStatus(null, output(status))
  })

  watcher.on('events', (games) => {
    if (games.length === 0) setStatus(null, output('No game today'))
  })

  return watcher
}
