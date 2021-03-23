const fs = require('fs')

function handler(event) {
  // if (event.resource.imdisplayname === undefined) {
  //   console.log(event)
  // }
  fs.appendFileSync('./output.json', JSON.stringify(event, null, 2))
  console.log('User', event.resource.lastMessage.imdisplayname, 'sent a new reply:', event.resource.lastMessage.content)
}

module.exports = {
  handler
}