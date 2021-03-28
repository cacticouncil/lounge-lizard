const { MSTeamsClient } = require('ms-teams-client')
const atob = require('atob')

const MAX_CACHE_LENGTH = (2 * 60 * 1000) // two minutes

/**
 * Unlike Slack, where each "workspace" is linked to one account, a Microsoft account
 * may contain multiple workspaces (called Teams)
 */
class MicrosoftAccount extends MSTeamsClient {
  /**
   * Find or create Microsoft Account. This method exists because I cannot figure out
   * how the config manager works.
   * @param {object} options Options
   * @param {object} options.tokens tokens object
   * @returns {MicrosoftAccount}
   */
  static findOrCreate(options = {}) {
    const { tokens } = options

    // extract oid (user object id) and tid (tenant id)
    const { oid, tid } = JSON.parse(atob(tokens.chatSvcAggToken.split('.')[1]))

    if (!this.cache) this.cache = {}

    const key = `${oid}_${tid}`
    if (!this.cache[key]) {
      const msa = new MicrosoftAccount(options)
      msa.poller.start()
      this.cache[key] = msa
    } else {
      // assuming input tokens are newer
      this.cache[key].setTokens(tokens)
    }

    return this.cache[key]
  }

  /**
   * Create a new MicrosoftAccount instance
   * @param {object} options Options
   * @param {object} options.tokens tokens object
   */
  constructor(options = {}) {
    const { user_oid, tenant_id, ...others } = options
    super(others)

    this.id = `${user_oid}_${tenant_id}`

    /** @type {Record<string, { promise: Promise<any>, time: number }>} */
    this.apiCache = {}
  }

  loadTeams() {
    // I had to cache this because all teams will call loadTeams on initialize.
    // If I was not careful, I can get rate-limited by MS
    let cachedValue = this.apiCache['loadTeams']

    // check if cached value exists and is within time limit
    if (!cachedValue || (cachedValue.time + MAX_CACHE_LENGTH) < Date.now()) {
      cachedValue = this.apiCache['loadTeams'] = {
        promise: this.fetchTeams()
          .then(teams => teams.teams)
          .catch((err) => {
            delete this.apiCache['loadTeams']
            throw err
          }),
        time: Date.now()
      }
    }

    return this.apiCache['loadTeams'].promise
      .then(teams => {
        teams.forEach(team => {
          this.emit(`update-team:${team.id}`, team)
        })
        return teams
      })
  }
}

module.exports = MicrosoftAccount
