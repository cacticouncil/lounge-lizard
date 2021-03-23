const querystring = require('querystring')
const { URL, URLSearchParams, ...url } = require('url')

const axios = require('axios').default
const gui = require('gui')
const { v4: uuid } = require('uuid')
const atob = require('atob')
const btoa = require('btoa')

const SKYPE_TOKEN_SCOPE = 'https://api.spaces.skype.com/.default openid profile'
const CHAT_SERVICE_TOKEN_SCOPE = 'https://chatsvcagg.teams.microsoft.com/.default openid profile'

class MsTeamsLogin {
  constructor(window, callback) {
    this.window = window
    this.callback = callback
    this.user_oid = null
    this.chatServiceToken = null
    this.skypeToken = null

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
      if (/teams.microsoft.com\/(?:go|_)#?$/.test(url)) {
        this.browser.executeJavaScript('window.location.href', this.onNavigation.bind(this))
      } else {
        this.onNavigation(true, url)
      }
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

      this.user_oid = oid

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

      console.log(`Loading url: ${url}`)
      this.browser.loadURL(url.toString())
    } else if (/^https:\/\/teams.microsoft.com\/go#access_token=/.test(result)) {
      const access_token = result.match(/access_token=([^&]+)/i)[1]
      const token_parsed = JSON.parse(atob(access_token.split(".")[1]))

      let nextUrl = null
      switch (token_parsed.aud) {
        case 'https://chatsvcagg.teams.microsoft.com':
          this.chatServiceToken = access_token
          nextUrl = generateScopeAuthorizeURL({ tid: token_parsed.tid, scope: SKYPE_TOKEN_SCOPE })
          break
        case 'https://api.spaces.skype.com':
          console.log('skype token!!', access_token)
          const response = await axios.post('https://teams.microsoft.com/api/authsvc/v1.0/authz', null, {
            headers: {
              Authorization: `Bearer ${access_token}`
            }
          })
          this.skypeToken = response.data.tokens.skypeToken
          nextUrl = generateScopeAuthorizeURL({ tid: token_parsed.tid, scope: CHAT_SERVICE_TOKEN_SCOPE })
          break
        default:
          console.warn('Got unknown aud', token_parsed)
      }

      if (this.skypeToken && this.chatServiceToken) {
        this.browser.stop()
        this.window.close()
        this.callback({
          skypeToken: this.skypeToken,
          chatSvcAggToken: this.chatServiceToken
        })
      } else if (nextUrl) {
        console.log(`going to next url: ${nextUrl}`)
        this.browser.loadURL(nextUrl.toString())
      }
    }
  }

  load() {
    // const url = `https://login.microsoftonline.com/common/oauth2/authorize?response_type=id_token&client_id=5e3ce6c0-2b1f-4285-8d4b-75ee78787346&redirect_uri=${encodeURIComponent('https://teams.microsoft.com/go')}&state=${state}&=&client-request-id=${clientRequestId}&x-client-SKU=Js&x-client-Ver=1.0.9&nonce=${nonce}&domain_hint=`
    // state=7ab35ee3-061a-4ffc-8ee3-5d116c8d83e8&&client-request-id=8b9e8a98-6604-4781-9988-596f87ab1c05&x-client-SKU=Js&x-client-Ver=1.0.9&nonce=b2b656fe-490a-4bae-bfcf-5a181aefe0ee&domain_hint=

    // initial login url
    const url = new URL(`https://login.microsoftonline.com/common/oauth2/authorize`)
    url.search = new URLSearchParams({
      response_type: 'id_token',
      client_id: '5e3ce6c0-2b1f-4285-8d4b-75ee78787346',
      redirect_uri: 'https://teams.microsoft.com/go',
      state: uuid(),
      nonce: uuid(),
      'x-client-SKU': 'Js'
    })
    console.log(`Loading url: ${url}`)
    this.browser.loadURL(url.toString())
  }

  unload() {
    // function required by window manager
  }
}

function generateScopeAuthorizeURL(options = {}) {
  const { tid, scope } = options

  const url = new URL(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/authorize`)
  url.search = new URLSearchParams({
    response_type: 'token',
    scope: scope,
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

  return url
}

// Register ll:// protocol to work around CORS problem with file:// protocol.
gui.Browser.registerProtocol('ll', urlStr => {
  const parsedUrl = url.parse(urlStr)
  if (parsedUrl.host !== 'file') return gui.ProtocolStringJob.create('text/plain', 'Unsupported type')
  const query = querystring.parse(parsedUrl.query)
  return gui.ProtocolFileJob.create(query.path)
})

module.exports = MsTeamsLogin