# Lounge Lizard for Microsoft Teams 

**Important notice:** Please reference the ms-teams-client repository (https://github.com/cacticouncil/ms-teams-client) for the current Microsoft Teams implementation.

## Microsoft Graph 

Microsoft graph is the gateway to getting Microsoft Teams integrated into the Lounge Lizard chat client.  It exposes the necessary APIs for all Microsoft products.

## Register application 

Microsoft requires new applications to register with them in order to gain access to the Microsoft Graph API. The documentation for that process is found here: https://docs.microsoft.com/en-us/graph/auth-register-app-v2

You’ll need some elevated permissions.

## MSGraph SDK

https://github.com/microsoftgraph/msgraph-sdk-javascript

This is the officially supported “lightweight wrapper” around MS Graph for Node.js. It is available via NPM for download: `npm install @microsoft/microsoft-graph-client`.

Microsoft highly recommends using this module when building a client that consumes any Microsoft 365 data. 

## Authentication

Like with any API, Microsoft Graph requires authentication. Microsoft recommends using an Auth SDK to simplify the authentication process. The recommended open source SDK for Node is found here: https://github.com/panva/node-openid-client. Alternatively, stick with the current auth implementation for Slack and simply substitute in the Microsoft requirements.

To authenticate with a user, follow these instructions: https://docs.microsoft.com/en-us/graph/auth-v2-user

## Teams API

PLEASE NOTE: As of April 2020, the Microsoft Graph Teams API stable release does not include any chat message functionality. The chatMessage endpoint is currently in beta at the time of writing this. Therefore, proceeding with work on this should be done with caution as it is not officially supported. 

Here’s the documentation for the chatMessage endpoints: https://docs.microsoft.com/en-us/graph/api/resources/chatmessage?view=graph-rest-beta

Endpoints include, but are not limited to: Create chatMessage, get chatMessage, create subscription for channel, list all chat messages in channel, and get delta chat messages in channel. 

Below is a JSON representation of the chatMessage return type. It appears to have everything needed to integrate nicely into the existing Lounge Lizard application. 

``{
  "id": "string (identifier)",
  "replyToId": "string (identifier)",
  "from": {"@odata.type": "microsoft.graph.identitySet"},
  "etag": "string",
  "messageType": "string",
  "createdDateTime": "string (timestamp)",
  "lastModifiedDateTime": "string (timestamp)",
  "deletedDateTime": "string (timestamp)",
  "subject": "string",
  "body": {"@odata.type": "microsoft.graph.itemBody"},
  "summary": "string",
  "attachments": [{"@odata.type": "microsoft.graph.chatMessageAttachment"}],
  "mentions": [{"@odata.type": "microsoft.graph.chatMessageMention"}],
  "importance": "string",
  "policyViolation": "string",
  "reactions": [{"@odata.type": "microsoft.graph.chatMessageReaction"}],
  "locale": "string",
  "deleted": true
}``

## Extending the API

There are some cases where the Microsoft API is insufficient for the data we want to display and manipulate like, for example, adding custom emojis for message reactions. Luckily, Microsoft boasts the ability to extend its APIs without having an external data store. More on that here: https://docs.microsoft.com/en-us/graph/extensibility-overview.

Unfortunately, chatMessage is not one of the resources for which custom extensions are currently supported.

## Using the Postman collections

See the **postman** folder for Postman collections and instructions for using them to interact with the Microsoft Graph API.

## Known Issues

See the file **known-issues.md** for more information.

## Unsupported Functionality

* **Message attachments:** Microsoft Teams supports message attachments.  However, the Teams concept of attachments is most 
similar to Slack's files.  Teams does not have any functionality that resembles Slack's attachments functionality.  It is 
important to note that, even for Slack, attachments are deprecated and have been replaced by files.

* **Message pinning:** Microsoft Teams does not have the concept of message pinning.

* **Reacting to messages:** On the surface it would seem that the Microsoft Graph API supports reacting to messages.  The 
chatMessage resource has a *reactions* property (https://docs.microsoft.com/en-us/graph/api/resources/chatmessage?view=graph-rest-beta) 
and the API exposes a method for updating chat messages (https://docs.microsoft.com/en-us/graph/api/chatmessage-update?view=graph-rest-beta&tabs=http).  However, at this time the API only supports updating the _policyViolation_ property of a 
chat message.  It seems like it would be possible to specify a reaction when sending a new chat message, but this is not the 
normal use case for message reactions.

* **Receiving new messages:** The Slack API uses websockets to push updates such as new messages out to clients.  The Microsoft
Graph API does not support pushes in this manner.  With the MS Graph API, there are two options for receiving updates to the list 
of messages in a channel: requery the API for the channel's entire message list or use delta function calls 
(https://docs.microsoft.com/en-us/graph/delta-query-messages) to retrieve only messages that have changed.  However, Microsoft 
has strict limits on polling.  See more at https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0#polling-requirements and https://docs.microsoft.com/en-us/graph/throttling.  You can also find more information in the 
**Receiving new messages in the MS Teams web application** section below.

* **Saving messages:** Also known as starring messages.  Microsoft Teams does support the concept of saving messages and 
the Microsoft Teams desktop app lets users see a list of messages that they have saved.  However, the Microsoft Graph API 
does not provide a means for a consumer to set the saved status of a message nor does it provide a way to retrieve a list
of saved messages.

* **Sending files/attachments:** In the Microsoft Graph API, the collection of files attached to a message is read-only.  
Sending files/attachments is not currently supported.


## Supported but Not Implemented Functionality

* **Code snippets:** supported by MS Teams and Graph API but functionality is quite different than Slack.  With Slack, a code 
snippet is just an unnamed file that is downloaded by Lounge Lizard the same as any other file that is attached to a message.
With Teams and the Graph API, a code snippet is also included in a message's attachments collection but it is a link to 
another API call that must be made to retrieve the contents.

* **Formatting in messages:** MS Teams and the Graph API support formatting in messages using html.  Currently, Loung Lizard uses a 
rich text editor to compose messages but converts formatting into markdown when sending.  The application needs to be updated to 
convert the markdown to html.  This may be relatively straightforward as the underlying issue appears to be that when the rich text 
editor was implemented, the UI code was made responsible for converting the editor's html to markdown and this conversion simply needs
to be pushed down to a Slack-specific class.

* **Mentions:** The mechanism employed by MS Teams and the Graph API for sending mentions in a message is considerably more complex 
than the mechanism employed by Slack.  In Slack, mentions are sent as specially-formatted text embedded in the message itself.  In 
MS Teams, on the other hand, there are two components to sending mentions.  The first is a special html-like tag in the message body.  
The second component is an object that is added to the message's mentions collection which contains information about the person, 
team, or channel being mentioned.  The best way to see how the message must be formatted is to send one or more messages using the 
MS Teams web or desktop app, use Postman to invoke the Graph API to get the message that was sent, and inspect the response.

* **Team icon:** It is possible to get use the Graph API to get a photo/icon for a team but Microsoft's model for doing this is 
quite different than Slack's model.  With Slack, the team's icon is openly available via unauthenticated http GET.  As a result, 
the Lounge Lizard code that retrieves the icon is embedded in the UI code and is unaware of the chat service classes.  With the 
Graph API, an authenticated API call must be made to retrieve the icon/photo.  For example, to retrieve the 120x120 photo for 
a team, invoke https://graph.microsoft.com/v1.0/groups/{teamId}/photos/120x120/$value.  See https://docs.microsoft.com/en-us/graph/api/profilephoto-get?view=graph-rest-beta for more information.  Note that the default Lounge Lizard behavior in the absence of an icon 
for an account is essentially the same as the image that is returned from the Graph API for a team that does not have a photo set.

* **User avatars:** See **Team icon** above.  An example of a URL for the 120x120 photo for a user is https://graph.microsoft.com/v1.0/users/{{UserId}}/photos/120x120/$value.

* **Getting presence/status of other users:** There is support for getting another user's presence/status via the Graph API but 
Lounge Lizard particularly needs to be able to receive updates (a mechanism for receiving updates has not yet been identified; see more below).  See https://docs.microsoft.com/en-us/graph/api/presence-get?view=graph-rest-beta&tabs=http for more information.

## Receiving new messages in the MS Teams web application

The Microsoft Teams web and desktop applications have the same need to detect updates including the arrival of new messages as does 
Lounge Lizard.  It is not currently known exactly how the MS Teams desktop application achieves this but the web browser's 
developer tools provide insight into how the web application detects updates (presumably the desktop application's functionality is
similar).  The short answer to the question posed here is that the Teams web application does, in fact, rely on polling to detect 
new messages but it is not polling the Microsoft Graph API.  The API that the Teams web application is polling appears to be designed 
specifically for polling.  It takes approximately 40 seconds for the server to return a response for each invocation of the API and,
if there are no updates, a new request is made when the previous request is completed.  Note that we can assume that a response would
be received in less than 40 seconds if the server had updates to report.  There are a few challenges involved with attempting to 
leverage this API in Lounge Lizard.

1. The API is undocumented.  It will be necessary to reverse-engineer the API to determine how to interact with it.  A particular 
challenge will be determining the exact URL.  The URL for the API appears to include a value derived from the user's user id (which 
can be obtained from the Graph API).  However, there are values prepended to the user id whose purpose is not known and there is 
another GUID included in the URL whose meaning is not known.  At example of the API's URL is https://northcentralus.notifications.teams.microsoft.com/users/8:orgid:aa9e52f6-3e46-49b7-b742-c1baa008154c/endpoints/77a1061d-a476-441b-9e82-46cc8f18c90e/events/poll.
2. Authentication for the polling API is based on a Skype token and not on the access token that is used with the Microsoft Graph API.  
It seems that the Teams web application may use a normal access token for some other API calls and it may use that access token to 
obtain a Skype token but the exact mechanism for doing this has not been identified. Some resources with potentially useful information can be found at:
   - https://stackoverflow.com/questions/59055629/how-to-generate-a-skyetoken-for-teams-native-apis
   - https://github.com/sanderdewit/teams-module/blob/master/teams_v2.psm1
   - https://github.com/msndevs/protocol-docs/wiki/Authentication
3. The format of the API responses is not documented and does not appear to be the same as responses from MS Graph API methods that return chat messages.
4. There is a possibility of breaking changes in the API at any time.  Because it is not a documented public API such changes would probably not be publicized.  However, if the MS Teams desktop application relies on the same back-end APIs as the web application the possibility of breaking changes should be minimal.
5. There may be other related API calls that must also be made to set or get important information.  For example, browser developer tools show regular calls made to API methods called **getpresence** and **reportmyactivity**.  Presumably, these methods are used to report the current user's status (i.e. available, busy, away, etc.) and get the status of other users.  See the SlackAccount class for a complete list of events for which the Slack client can received updates from the server.

