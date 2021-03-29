const fs = require('fs')
const accountManager = require('../../../controller/account-manager')

function handler(event) {
  // fs.appendFileSync('./output-new-msg.json', JSON.stringify(event, null, 2))
  console.log('User', event.resource.imdisplayname, 'sent a new message:', event.resource.content)
  for (const a of accountManager.accounts) {
    if (a.service.id === 'teams') {
      console.log('THE TEAM IS:', a)
      a.reload()
    }
  }
}

module.exports = {
  handler
}