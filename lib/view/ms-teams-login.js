const querystring = require('querystring')
const { URL, URLSearchParams, ...url } = require('url')

const gui = require('gui')
const { v4: uuid } = require('uuid')
const atob = require('atob')
const btoa = require('btoa')

class MsTeamsLogin {
  constructor (window) {
    this.window = window
    this.user_oid = null

    // setup view
    this.view = gui.Container.create()
    this.view.setStyle({
      flex: 1
    })

    // setup browser
    this.browser = gui.Browser.create({
      devtools: true,
      contextMenu: true,
      allowFileAccessFromFiles: true,
      hardwareAcceleration: false
    })

    this.browser.setStyle({
      flex: 1
    })

    this.browser.setBindingName('ll')

    // setup browser callbacks
    this.browser.onCommitNavigation = (_browser, url) => {
      this.onNavigation(true, url)
      // TODO: below line not needed by macos. double check on windows.
      // browser.executeJavaScript('window.location.href', this.onNavigation.bind(this))
    }

    this.view.addChildView(this.browser)
  }

  // TODO: remove success argument if not needed
  async onNavigation(success, result) {
    if (!success || typeof result !== "string") return

    if (/^https:\/\/teams.microsoft.com\/go#id_token=/.test(result)) {
      const id_token = result.match(/id_token=([^&]+)/i)[1]

      const parsed_id = JSON.parse(atob(id_token.split(".")[1]))
      const { oid, tid } = parsed_id


      const url = new URL(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/authorize`)
      url.search = new URLSearchParams({
        response_type: 'token',
        scope: 'https://api.spaces.skype.com/.default openid profile',
        client_id: '5e3ce6c0-2b1f-4285-8d4b-75ee78787346',
        redirect_uri: 'https://teams.microsoft.com/go',
        state: btoa(JSON.stringify({
          id: uuid(),
          ts: Math.ceil(Date.now() / 1000),
          method: "silentInteraction"
        })),
        nonce: uuid(),
        client_info: '1',
        'x-client-SKU': 'MSAL.JS',
        'prompt': 'none',
        'response_mode': 'fragment'
      })
      // `&client_info=1&&x-client-Ver=1.3.4&claims=%7B%7D&login_hint=aharidas%40ufl.edu&safe_rollout=apply%3A8a2fcdf7-d1dd-4a19-8929-a91bb4fef2e3&client-request-id=f735c069-a95a-4484-81ba-45b94814ee84&`

      console.log(`Loading url: ${url}`)
      this.browser.loadURL(url.toString())
    } else if (/^https:\/\/teams.microsoft.com\/go#access_token=/.test(result)) {
      const access_token = result.match(/access_token=([^&]+)/i)[1]
      const token_parsed = JSON.parse(atob(access_token.split(".")[1]))

      this.browser.stop()
      this.window.close()
    }
  }

  load() {
    // const encodedScope = scope.map(perm => `https%3A%2F%2Fgraph.microsoft.com%2F${perm}`).join('%20')
    // this.browser.loadURL(auth_uri.replace("{{client_id}}", client_id).replace("{{scope}}", encodedScope))
    const state = uuid()
    const clientRequestId = uuid()
    const nonce = uuid()

    // const url = `https://login.microsoftonline.com/common/oauth2/authorize?response_type=id_token&client_id=5e3ce6c0-2b1f-4285-8d4b-75ee78787346&redirect_uri=${encodeURIComponent('https://teams.microsoft.com/go')}&state=${state}&=&client-request-id=${clientRequestId}&x-client-SKU=Js&x-client-Ver=1.0.9&nonce=${nonce}&domain_hint=`

    const url = 'https://teams.microsoft.com/'
    console.log(`Loading url: ${url}`)
    this.browser.loadURL(url)
  }

  unload() {
    // function required by window manager
  }
}

// Register ll:// protocol to work around CORS problem with file:// protocol.
gui.Browser.registerProtocol('ll', urlStr => {
  const parsedUrl = url.parse(urlStr)
  if (parsedUrl.host !== 'file') return gui.ProtocolStringJob.create('text/plain', 'Unsupported type')
  const query = querystring.parse(parsedUrl.query)
  return gui.ProtocolFileJob.create(query.path)
})

module.exports = MsTeamsLogin