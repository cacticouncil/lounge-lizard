const Channel = require("../../model/channel");
const TeamsMessage = require("./teams-message");
const TeamsThread = require("./teams-thread");
const emoji = require("./emoji.json");
const { parseEmojiFromMessage } = require("./message-parser");

class TeamsChannel extends Channel {
  constructor(team, channel) {
    super(team, 'channel', channel.id, channel.displayName)

    this.description = channel.description || ''
    this.isDefault = (channel.displayName === 'General')
    this.isMember = true // For now, just assume that the user is member all channels we got for them
  }

  openThreadImpl(id) {
    const threadMessages = this.messages.filter(m => m.id === id)
    return new TeamsThread(this, threadMessages[0])
  }

  async getMembers() {
    return await this.account.getChannelMembers(this.id)
  }

  async getProfile(id, timestamp) {
    const message = this.findMessage(id, timestamp)
    this.updateProfile(id, timestamp)
    return message
  }

  async pinMessage() {
    // As of September 1, 2020, Teams does not support pinning messages.
    // See https://microsoftteams.uservoice.com/forums/555103-public/suggestions/16911532-ability-to-pin-message-files-articles-shared-withi
    throw new Error('Message pinning is not supported for MS Teams');
  }

  //view pinned messages, only works at console atm
  async viewPinned() {
    throw new Error('Message pinning is not supported for MS Teams');
  }

  async setMessageStar() {
    throw new Error('Saving messages is not supported for MS Teams');
  }

  async openReactPicker(id, timestamp) {
    const message = this.findMessage(id, timestamp);

    const size = 22;
    const nativeEmoji = Object.keys(emoji).map(e => {
      return { name: e, x: emoji[e].x * size, y: emoji[e].y * size, size };
    });

    if (message) {
      return this.showReactPicker(id, timestamp, {
        customEmoji: [],
        nativeEmoji: nativeEmoji
      });
    }
  }

  async setMessageReaction() {
    throw new Error('Reacting to messages is not supported for MS Teams.');
  }

  /**
   * Handles actually getting messages from the server
   * @override
   * @returns messages
   */
  async readMessagesImpl() {
    /** @type {import('./teams-account')} */
    const team = this.account
    // limit of 50 is max
    const replyChains = (await team.msAccount.fetchChannelMessages(team.id, this.id, 50))

    const messages = replyChains
      .map(chain => {
        const messages = chain.messages
        if (messages.length > 0) return messages[messages.length - 1]
        else return null
      })
      .filter(x => Boolean(x))
      .map(message => {
        let msgText = ''
        switch (message.messageType) {
          case 'RichText/Html':
            msgText = `Html message ${message.content}`
            break
          case 'Text':
            msgText = message.content
            break
          default:
            msgText = `Unknown format ${message.messageType}`
            break
        }

        return {
          text: msgText,
          id: message.id,
          from: {
            id: message.from,
            displayName: message.imDisplayName
          },
          composeTime: message.composeTime
        }
      })
      .reverse()
      .map(msg => new TeamsMessage(this.account, msg))

    for (const m of messages) // need to get additional info.
      await m.fetchPendingInfo(this.account)

    return messages
  }

  async sendMessage(text) {
    text = parseEmojiFromMessage(await this.parseTags(text), true)

    const response = await this.account.apiHelper.sendChannelMessage(this.account.id, this.id, text);

    const message = new TeamsMessage(this.account, response)
    await message.fetchPendingInfo(this.account)
    this.dispatchMessage(message)
  }

  //replace @tags with appropriate tag syntax
  // This will need to be updated when support for sending @mentions is added to Lounge Lizard
  async parseTags(text){
    if (text.includes('@')){
      //for special mentions
      text = text.replace('@everyone', '<!everyone>')
      text = text.replace('@here', '<!here>')
      text = text.replace('@channel', '<!channel>')

      let search_results = null
      //for user mentions
      if(search_results = text.match(/@[a-z0-9]+/gi)){
        for(let result of search_results){
          let name = result.substring(1)
          let id = this.account.findUserIdByName(name)
          if(id)
            text = text.replace(result, `<@${id}>`)
          else{ //search again for usernames with a space between names
            let search_with_space = null
            if (search_with_space = text.match(/@[a-z0-9]+ [a-z0-9]+/gi)){
              for(let result of search_with_space){
                name = result.substring(1)
                id = this.account.findUserIdByName(name)
                if(id)
                  text = text.replace(result, `<@${id}>`)
              }
            }
          }
        }
      }
    }
    return text
  }

  async notifyReadImpl() {
    /***
     * The MS Graph API does not expose a method for setting the ID of the last message
     * that has been read by the user.  However, the base class will throw an exception
     * if this method is not implemented in child classes, so we must have this here even
     * though it does not do anything.
     */
  }
}

module.exports = TeamsChannel
