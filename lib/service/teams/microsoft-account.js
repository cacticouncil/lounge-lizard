const { MSTeamsClient } = require('ms-teams-client')
const atob = require('atob')

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
  }
}

module.exports = MicrosoftAccount
