const gui = require('gui')
const atob = require('atob')

const MicrosoftAccount = require('./microsoft-account')
const MsTeamsLogin = require('../../view/ms-teams-login')
const Service = require('../../model/service')
const TeamsAccount = require('./teams-account')

/**
 * Holds service-wide helper functions.
 * This is a single-instance class (see export)
 */
class TeamsService extends Service {
  constructor() {
    super('teams', 'Teams')
  }

  /**
   * Called when login window needs to be shown. Does not actually login.
   * @override
   */
  login() {
    if (!this.loginWindow) {
      this.createLoginWindow()
      this.loginWindow.center()
    }

    this.loginWindow.activate()
  }

  /**
   * Create team (incorrectly named account)
   * @param {string} id Unique id
   * @param {string} name Name of team
   * @param {string} tokens Token object (deserialized from config file most of the time)
   * @returns {TeamsAccount} new team
   * @override
   */
  createAccount(id, name, tokens) {
    return new TeamsAccount(this, id, name, JSON.parse(tokens))
  }

  /**
   * Create the login window.
   */
  createLoginWindow() {
    this.loginWindow = gui.Window.create({})
    this.loginWindow.setTitle('Login to Microsoft Teams')
    this.loginWindow.onClose = () => (this.loginWindow = null)

    const view = new MsTeamsLogin(this.loginWindow, this.loginWithTokens.bind(this))
    this.loginWindow.setContentView(view.view)
    this.loginWindow.setContentSize({ width: 400, height: 600 })
    view.load()

    this.loginWindow.setContentSize({
      width: 400,
      height: 600
    })
  }

  /**
   * Actually login
   * @param {object} tokens Tokens obtained by browser
   */
  async loginWithTokens(tokens) {
    if (this.loginWindow) this.loginWindow.close()
    try {
      // use skype token to extract oid and tid (user and tenant ids)
      const { oid, tid } = JSON.parse(atob(tokens.chatSvcAggToken.split('.')[1]))
      const msAccount = MicrosoftAccount.findOrCreate({
        user_oid: oid,
        tenant_id: tid,
        tokens
      })

      const teams = (await msAccount.fetchTeams()).teams

      teams.forEach((team) => {
        this.createAccount(team.id, team.displayName, JSON.stringify(tokens))
      })
    } catch (e) {
      this.showErrorDialog('Could not log in', e.message || 'Unknown error')
    }
  }

  /**
   * Create error dialog (a higher gui version supports MessageBox, but this version does not)
   * @param {string} title Title of window
   * @param {string} message Message
   */
  showErrorDialog(title, message) {
    if (!this.errorDialog) {
      this.errorDialog = gui.Window.create({})
      this.errorDialog.onClose = () => (this.errorDialog = null)
      this.errorDialog.center()
    }

    const contentView = gui.Container.create()
    const errorMsg = gui.Label.create(message)

    // window properties
    this.errorDialog.setTitle(title)
    this.errorDialog.setContentView(contentView)
    this.errorDialog.setContentSize({ width: 400, height: 100 })

    // content
    contentView.setStyle({ paddingLeft: 5, flexDirection: 'row', marginBottom: 0 })
    contentView.addChildView(errorMsg)

    this.errorDialog.activate()

    return this.errorDialog
  }
}

module.exports = new TeamsService()
