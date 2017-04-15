# mlb-slack-status

Sync you Slack status with an MLB team.

![go cubs](./screenshot.png)


## Use it!

1. Clone this repo
1. `npm install`
1. `mv .env.example .env`
1. Go to https://api.slack.com/custom-integrations/legacy-tokens to get a legacy token
1. Choose the team you want to update you status on
1. Copy the token and paste it as the value for `TOKEN` in `.env`
1. Set `TEAM` in `.env` to the 2 or 3 letter code for your team. (See [this file](./lib/teams.js) for a full list)
1. `npm run deploy`

You should now have a server that gets the score for your team up to every 5 minutes and updates your Slack status with the current result.

*Bonus*: You should upload your team's logo as a custom emoji to Slack using the team code!

*Note*: if you redeploy it for some reason, make sure you teardown the old servers with `npm run clean`.
