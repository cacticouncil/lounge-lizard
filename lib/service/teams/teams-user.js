const User = require('../../model/user')

class TeamsUser extends User {
  // The "account" parameter is not currently used in this class but it is
  // used in the Slack equivalent of this class.  Keeping the account parameter
  // here to maintain consistency with the SlackUser class and so that the signature
  // of the constructor does not need to change if an instance of the TeamsAccount
  // is needed when the TODO items below are addressed.
  constructor(account, apiResponse) {

    let phoneNumber = ''

    /***
     * With Slack, a user's icon/avatar is an image file that can be retrieved via an
     * unauthenticated http GET.  For Microsoft Teams and the Graph API, retrieving the
     * user's photo requires making an authenticated API call.  The Lounge Lizard architecture
     * does not currently support making an authenticated http request to retrieve an image/avatar,
     * so until that architecture is changed the icon property of this class will be set to an
     * empty string (in the SlackUser class it is set to a URL for the image file).
     */
    let icon = ''

    /***
     * The concept of status text seems to be quite different in Teams
     * than it is in Slack.  In Teams, a user can set some status text
     * that is displayed to other users for a set period of time.  However,
     * The MS Graph API does not appear to expose any method to retrieve
     * the status text.
     */
    let statusText = ''

    // Slack makes a distinction between a user's real name and their
    // display name.  MS Teams does not appear to offer users the ability
    // to define a display name that is different than their real name,
    // so the call to the superclass constructor below uses display name
    // for both display name and real name.
    super(apiResponse.mri, apiResponse.displayName, icon, apiResponse.displayName, apiResponse.email, phoneNumber, statusText, '')
    this.isBot = false;
  }


  setAway(isAway) {
    this.isAway = isAway
  }
}

module.exports = TeamsUser
