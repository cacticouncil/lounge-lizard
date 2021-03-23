const fs = require('fs')

function handler(event) {
  fs.appendFileSync('./output-new-msg.json', JSON.stringify(event, null, 2))
  console.log('User', event.resource.imdisplayname, 'sent a new message:', event.resource.content)
}

module.exports = {
  handler
}