const { MSTeamsClient } = require('ms-teams-client')
const TeamsService = require('./index')

/**
 * Unlike Slack, where each "workspace" is linked to one account, a Microsoft account
 * may contain multiple workspaces (called Teams)
 */
class MicrosoftAccount extends MSTeamsClient {
  /**
   * Find or create Microsoft Account. This method exists because I cannot figure out
   * how the config manager works.
   * @param {object} options options. any unspecified keys will be used for initialization
   * @param {string} options.user_oid User's object id
   * @param {string} options.tenant_id Tenant id (i believe this is `tid` in many tokens)
   * @returns {MicrosoftAccount}
   */
  static findOrCreate(options = {}) {
    const { user_oid, tenant_id, ...others } = options
    if (!this.cache) this.cache = {}

    const key = `${user_oid}_${tenant_id}`
    if (this.cache[key]) return this.cache[key]

    return (this.cache[key] = new MicrosoftAccount(others))
  }

  /**
   * Create a new MicrosoftAccount instance
   * @param {object} options Options
   * @param {object} options.tokens tokens object
   */
  constructor(options = {}) {
    const { ...others } = options
    super(others)
  }
}

module.exports = MicrosoftAccount
