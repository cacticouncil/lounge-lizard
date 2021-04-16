const accountManager = require('../../../controller/account-manager')

/**
 * Handle a new message.
 */
function handler() {
  // TODO: Optimize this code to add message to channel instead of forcing the
  //       entire "team" to reload. This naive approach was put in as a proof of concept.
  //       Should also consider making this a re-emitter; i.e. use the event argument to
  //       figure out which team this message belongs to, and then re-emit for that
  //       specific team.
  for (const a of accountManager.accounts) {
    if (a.service.id === 'teams') {
      a.reload()
    }
  }
}

module.exports = {
  handler
}
