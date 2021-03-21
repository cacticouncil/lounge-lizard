const gui = require('gui')
const keytar = require('keytar')

const MsTeamsLogin = require('../../view/ms-teams-login')
const Service = require('../../model/service')
const TeamsAccount = require('./teams-account')

class TeamsService extends Service {
  constructor() {
    super('teams', 'Teams')
  }

  login() {
    if (!this.loginWindow) {
      this.createLoginWindow()
      this.loginWindow.center()
    }

    this.loginWindow.activate()
  }

  createAccount(id, name, token) {
    return new TeamsAccount(this, id, name, token)
  }

  createLoginWindow() {
    this.loginWindow = gui.Window.create({})
    this.loginWindow.setTitle('Login to Microsoft Teams')
    this.loginWindow.onClose = () => this.loginWindow = null

    const view = new MsTeamsLogin(this.loginWindow, this.createAccount.bind(this))
    this.loginWindow.setContentView(view.view)
    this.loginWindow.setContentSize({ width: 400, height: 600 })
    view.load()

    this.adujstLoginWindowSize()
  }

  adujstLoginWindowSize() {
    this.loginWindow.setContentSize({
      width: 400,
      height: 600,
    })
  }

  createRow(contentView) {
    const row = gui.Container.create()
    row.setStyle({flexDirection: 'row', marginBottom: 5})
    contentView.addChildView(row)
    return row
  }
}

module.exports = new TeamsService
