const { MSTeamsClient } = require('ms-teams-client')

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
    const { user_oid, tenant_id } = options
    if (!this.cache) this.cache = {}

    const key = `${user_oid}_${tenant_id}`
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
