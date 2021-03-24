const { handler: newMessageHandler } = require('./new-message-listener')
const { handler: replyHandler } = require('./reply-message-listener')
const { handler: notificationStreamHandler } = require('./message-notification-stream-listener')
const { handler: updateMessageListener } = require('./update-message-listener')

class ListenerHelper {
  static registerAllEvents(client) {
    client.on('reply-message', replyHandler)
    client.on('new-message', newMessageHandler)
    client.on('message-notification-stream', notificationStreamHandler)
    client.on('update-message', updateMessageListener)

    console.log('done with registering')
  }
}

module.exports = { ListenerHelper }