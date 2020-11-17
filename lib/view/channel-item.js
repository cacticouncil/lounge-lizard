const gui = require('gui')

const ChatWindow = require('./chat-window')
const {theme} = require('../controller/theme-manager')

const NAME_FONT = gui.Font.default().derive(0, 'bold', 'normal')

class ChannelItem {
  constructor(parent, channel) {
    this.parent = parent
    this.channel = channel
    this.subscription = {
      onUpdateReadState: channel.onUpdateReadState.add(this._update.bind(this)),
      onUpdateMentions: channel.onUpdateMentions.add(this._update.bind(this)),
    }

    if (channel.type === 'channel') {
      this.title = (channel.isPrivate ? 'θ' : '#') + ' ' + channel.name
    } else {
      this.title = channel.name
      this.subscription.onUpdateAwayState = channel.onUpdateAwayState.add(this._update.bind(this))
    }

	this.hasGottenUsers = false
    this.hover = false
    this.isSelected = false
    this.disabled = false
	
	this.userArray = []
	this.presenceArray = []

    this.view = gui.Container.create()
    this.view.setMouseDownCanMoveWindow(false)
    this.view.setStyle({height: theme.channelItem.height})
    this.view.onDraw = this._draw.bind(this)
    this.view.onMouseEnter = () => {
      this.hover = true
      this.view.schedulePaint()
    }
    this.view.onMouseLeave = () => {
      this.hover = false
      this.view.schedulePaint()
    }
    this.view.onMouseUp = this._click.bind(this)
  }

  unload() {
    this.subscription.onUpdateReadState.detach()
    this.subscription.onUpdateMentions.detach()
    if (this.subscription.onUpdateAwayState)
      this.subscription.onUpdateAwayState.detach()
  }

  select() {
    if (this.isSelected)
      return
    this.isSelected = true
    this.view.schedulePaint()
  }

  deselect() {
    if (!this.isSelected)
      return
    this.isSelected = false
    this.view.schedulePaint()
  }

  _update() {
    this.view.schedulePaint()
  }

  _draw(view, painter, dirty) {
    const bounds = view.getBounds()
    const attributes = {
      color: theme.channelItem.normalColor,
      valign: 'center',
    }
    let padding = theme.channelItem.padding
    if (this.channel.type === 'dm')
      padding += theme.channelItem.presenceRadius * 2 + theme.channelItem.presencePadding + 1
    // Background color.
    if (this.isSelected) {
      painter.setFillColor(theme.channelItem.selectedBackground)
      painter.fillRect(Object.assign(bounds, {x: 0, y: 0}))
    } else if (this.hover) {
      painter.setFillColor(theme.channelItem.hoverBackground)
      painter.fillRect(Object.assign(bounds, {x: 0, y: 0}))
    }
    // Text font and color.
    if (this.isSelected) {
      attributes.color = theme.channelItem.selectedColor
      if (!this.channel.isRead)  // a selected channel may be unread.
        attributes.font = theme.channelItem.unreadFont
    } else if (this.disabled) {
      attributes.color = theme.channelItem.disabledColor
    } else if (this.channel.isMuted) {
      attributes.color = theme.channelItem.disabledColor
    } else if (!this.channel.isRead) {
      attributes.font = theme.channelItem.unreadFont
      attributes.color = theme.channelItem.selectedColor
    }
    // Draw channel title.
    const mentionsRadius = (bounds.height - 8) / 2
    const textRect = {
      x: padding,
      y: 0,
      width: bounds.width - padding - theme.channelItem.padding - theme.channelItem.mentionsWidth - 2 * mentionsRadius,
      height: bounds.height,
    }
    if (process.platform === 'darwin')
      textRect.height -= 3
    else if (process.platform === 'linux')
      textRect.height -= 1

    if (this.title) {
      painter.drawText(this.title, textRect, attributes)
    }

    // Draw mentions count.
    if (this.channel.mentions > 0)
      this._drawMentionsCount(painter, mentionsRadius, padding + textRect.width, bounds.height, textRect.height)
    // Draw presence indicator.
    if (this.channel.type === 'dm')
      this._drawPresenceIndicator(painter, bounds, attributes)
  }

  _drawMentionsCount(painter, radius, x, height, textHeight) {
    painter.beginPath()
    painter.setLineWidth(1)
    painter.arc({x: x + radius, y: height / 2}, radius, Math.PI / 2, -Math.PI / 2)
    painter.arc({x: x + radius + theme.channelItem.mentionsWidth, y: height / 2}, radius, -Math.PI / 2, Math.PI / 2)
    painter.setFillColor(theme.channelItem.mentionsBackground)
    painter.fill()
    const rect = {
      x: x + radius,
      y: 0,
      width: theme.channelItem.mentionsWidth,
      height: textHeight,
    }
    const attributes = {
      color: theme.channelItem.mentionsColor,
      align: 'center',
      valign: 'center',
    }
    painter.drawText(String(this.channel.mentions), rect, attributes)
  }

  _drawPresenceIndicator(painter, bounds, attributes) {
    const arcPos = {
      x: theme.channelItem.padding + theme.channelItem.presenceRadius + 1,
      y: bounds.height / 2,
    }
    if (process.platform === 'win32')
      arcPos.x += 2
    painter.beginPath()
    painter.setLineWidth(1)
    painter.arc(arcPos, theme.channelItem.presenceRadius - (this.channel.isAway ? 0.5 : 0), 0, 2 * Math.PI)
    if (this.channel.isAway) {
      painter.setStrokeColor(attributes.color)
      painter.stroke()
    } else {
      if (this.channel.isMultiParty)
        painter.setFillColor(attributes.color)
      else
        painter.setFillColor(theme.channelItem.presenceColor)
      painter.fill()
    }
  }

  _click(view, event) {
    // Click on the channel item.
    if (event.button === 1) {
      // Left click to open channel.
      this.parent.selectChannelItem(this)
    } else {  // for GTK+ button could be 3 for trackpad right click.
      // Right click to show context menu.
      if (!this.menu) {
        const leaveLabel = this.channel.type === 'channel' ? 'Leave channel'
                                                           : 'Close direct message'
        const menuOptions = [
          { label: 'Popup to new window', onClick: this._popup.bind(this) },
          { label: leaveLabel, onClick: this._leave.bind(this) },
        ]

        if (this.channel.type === 'channel') {
          menuOptions.push({ label: 'Show users', onClick: this._popupUsers.bind(this) })
        }

        this.menu = gui.Menu.create(menuOptions)
      }
      this.menu.popup()
    }
  }

  _popup() {
    const bounds = this.parent.mainWindow.chatBox.view.getBounds()
    new ChatWindow(this.channel, bounds)
  }

  _popupUsers() {
	this.getUsers()
  }
  
  _leave() {
    this.disabled = true
    this._update()
    this.parent.account.leave(this.channel)
  }
  
  /***
   * TODO (fall2020):
   * Eliminate tight coupling between this view and the Slack client
   */
  async getUsers(){
	  if (!this.hasGottenUsers) {
      const userList = await this.parent.account.getChannelMembers(this.channel.id)

      for (let u of userList) {
        this.userArray.push(u.name)
          
			  let presence = await this.parent.account.getUserPresence(u.id)
        this.presenceArray.push(presence)
      }
		  this.hasGottenUsers = true
	  }
	
	  const s = gui.Scroll.create()
	  s.setStyle({flex: 1})
    s.setScrollbarPolicy('never', 'automatic')
	
	  const contentView = gui.Container.create()
	  contentView.onDraw = this._drawUserList.bind(this)
	
    const win = gui.Window.create({})
    win.setContentView(contentView)
    win.setContentSize({ width: 350, height: 350 })
    s.setContentView(contentView)
    s.setContentSize({ width: 500, height: this.userArray.length * 50 })
    
    win.setTitle('Members')
    win.center()
    win.activate()
  }
  
  _drawUserList(view, painter, dirty){
	  for(let i = 0; i < this.userArray.length; ++i){ 
		const bounds = {
			x: 80,
			y: i * 50,
			width: 340,
			height: 20
    }
    const userText = this.presenceArray[i] ? this.userArray[i] + ' (' + this.presenceArray[i] + ')' : this.userArray[i]
		painter.drawText(userText, bounds, {font: NAME_FONT})
		bounds.y += 25
	  }
  }
}

module.exports = ChannelItem
