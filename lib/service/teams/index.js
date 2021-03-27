const gui = require('gui')
const keytar = require('keytar')
const atob = require('atob')

const MicrosoftAccount = require('./microsoft-account')
const MsTeamsLogin = require('../../view/ms-teams-login')
const Service = require('../../model/service')
const TeamsAccount = require('./teams-account')
const { MSTeamsClient } = require('ms-teams-client')
const { ListenerHelper } = require('./listeners/listener-helper')

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
   * Create team (incorrectly named account) to show on sidebar/etc
   * @param {any} id idk
   * @param {any} name idk
   * @param {any} token idk
   * @returns {TeamsAccount} new team
   * @override
   */
  createAccount(id, name, token) {
    return new TeamsAccount(this, id, name, token)
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
  loginWithTokens(tokens) {
    if (this.loginWindow) this.loginWindow.close()
    try {
      // use skype token to extract oid and tid (user and tenant ids)
      const { oid, tid } = JSON.parse(atob(tokens.skypeToken.split('.')[1]))
      const msAccount = MicrosoftAccount.findOrCreate({
        user_oid: oid,
        tenant_id: tid,
        tokens
      })

      console.log('yay!!', msAccount.fetchTeams())

      // ListenerHelper.registerAllEvents(this.client)
      // this.client.poller.start()
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
