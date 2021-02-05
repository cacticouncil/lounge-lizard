const Channel = require("../../model/channel");
const SlackMessage = require("./slack-message");
const SlackReaction = require("./slack-reaction");
const SlackThread = require("./slack-thread");
const emoji = require("./emoji.json");

class SlackChannel extends Channel {
  constructor(account, event) {
    super(account, 'channel', event.id, event.name)
    if (event.is_open === undefined) {
      this.isMember = event.is_member
      this.isDefault = event.is_general
    } else {
      this.isMember = event.is_open
      this.isPrivate = true
    }
    this.mentions = event.mention_count_display
    if (event.has_unreads)
      this.isRead = false
    if (event.last_read)
      this.lastReadTs = event.last_read
    if (event.purpose && event.purpose.value)
      this.description = event.purpose.value
    if (event.is_muted)
      this.isMuted = true
  }

  openThreadImpl(id) {
    return new SlackThread(this, id)
  }

  async getMembers() {
    return await this.account.getChannelMembers(this.id)
  }

  async getProfile(id, timestamp) {
    const message = this.findMessage(id, timestamp)
    this.updateProfile(id, timestamp)
    return message
  }


  async pinMessage(id, timestamp, isPinned, channelId = this.id){
    const message = this.findMessage(id, timestamp)
    const options = {channel: channelId, timestamp: id}
    if (message){
      let result = message.isPinned ? await this.account.rtm.webClient.pins.remove(options) : await this.account.rtm.webClient.pins.add(options)
    }
  }

  //view pinned messages, only works at console atm
  async viewPinned(id, channelId = this.id){
    const options = {channel: channelId, timestamp: id}
    let result = await this.account.rtm.webClient.pins.list(options)
    console.log("Pinned messages:")
    if (result.items.length === 0)
      console.log("[Empty]")
    for(let mes of result.items){
      console.log(mes)
    }
  }


  async setMessageStar(id, timestamp, hasStar, channelId = this.id) {
    const message = this.findMessage(id, timestamp)
    if (message) {
      // Slack quirk: setting stars does not emit server event.
      this.updateMessageStar(id, timestamp, hasStar)
      // Send to server after updated locally.
      const options = { channel: channelId, timestamp: id };
      if (hasStar) await this.account.rtm.webClient.stars.add(options);
      else await this.account.rtm.webClient.stars.remove(options);
    }
  }

  async openReactPicker(id, timestamp, channelId = this.id) {
    let customEmojiList = await this.account.rtm.webClient.emoji.list();
    customEmojiList = Object.keys(customEmojiList.emoji).filter(key => {
      return !customEmojiList.emoji[key].startsWith("alias:");
    }).reduce((finalObj, key) => {
       finalObj[key] = customEmojiList.emoji[key];
       return finalObj;
    }, {});

    const message = this.findMessage(id, timestamp);

    const size = 22;
    const nativeEmoji = Object.keys(emoji).map(e => {
      return { name: e, x: emoji[e].x * size, y: emoji[e].y * size, size };
    });

    if (message) {
      return this.showReactPicker(id, timestamp, {
        customEmoji: customEmojiList,
        nativeEmoji: nativeEmoji
      });
    }
  }

  async setMessageReaction(id, timestamp, name, reacted, channelId = this.id) {
    const message = this.findMessage(id, timestamp)
    if (message) {
      const options = { channel: channelId, timestamp: id, name };
      if (message.reactions.filter(react => react.name === name) < 1) {
        await this.account.rtm.webClient.reactions.add(options);
      }
      else {
        await this.account.rtm.webClient.reactions.remove(options);
      }
    }
  }

  async listEmotes() {
    const reactsResponse = await this.account.rtm.webClient.emoji.list();

    return Object.keys(reactsResponse.emoji).map(emojiName => {
      return { url: reactsResponse.emoji[emojiName], name: emojiName };
    });
  }

  async readMessagesImpl() {
    // Read messages.
    const options = { channel: this.id, limit: 100 }
    if (this.hasMessages())
      options.latest = this.messages[0]
    const { messages } = await this.account.rtm.webClient.conversations.history(options)
    // Converting messages.
    const smsgs = messages.reverse().map((m) => new SlackMessage(this.account, m))
    for (const m of smsgs)  // slack messages have async info.
      await m.fetchPendingInfo(this.account)
    return smsgs
  }

  async sendMessage(text) {
    text = await this.parseTags(text)
    const res = await this.account.rtm.sendMessage(text, this.id)
    const event = {
      user: this.account.currentUserId,
      text: text,
      ts: res.ts,
    }
    const message = new SlackMessage(this.account, event)
    await message.fetchPendingInfo(this.account)
    this.dispatchMessage(message)
  }

  //replace @tags with appropriate tag syntax
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
    if (!this.latestTs)
      return
    const options = { channel: this.id, ts: this.latestTs }
    if (this.isPrivate)
      //DEPRECATED --> await this.account.rtm.webClient.groups.mark(options)
  	  await this.account.rtm.webClient.groups.mark(options)
    else
      //DEPRECATED -->await this.account.rtm.webClient.channels.mark(options)
      await this.account.rtm.webClient.conversations.mark(options)
  }
}

module.exports = SlackChannel
