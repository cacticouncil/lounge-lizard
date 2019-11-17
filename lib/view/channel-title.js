const gui = require('gui')

const NORMAL_COLOR = '#C1C2C6'
const HOVER_COLOR = '#FFFFFF'
const PADDING = 5

const CHANNEL_TITLE_FONT = gui.Font.default().derive(2, 'normal', 'normal')
const CHANNEL_TITLE_FONT_SIZE = CHANNEL_TITLE_FONT.getSize()
const {theme} = require('../controller/theme-manager')

class ChannelTitle {
  constructor(title, parent) {
    this.title = title
    this.parent = parent
    this.view = gui.Container.create()
    this.view.setMouseDownCanMoveWindow(false)
    this.view.setStyle({height: CHANNEL_TITLE_FONT_SIZE + 2 * PADDING})
    this.view.onDraw = this.draw.bind(this)

    this.hover = false
    this.isSelected = false
    this.view.onMouseEnter = () => {
      this.hover = true
      this.view.schedulePaint()
    }
    this.view.onMouseLeave = () => {
      this.hover = false
      this.view.schedulePaint()
    }
    this.view.onMouseUp = () =>{
      this.parent.selectChannelTitle(this)
    }
  }

  draw(view, painter, dirty) {
    const bounds = {
      x: 0,
      y: PADDING,
      height: CHANNEL_TITLE_FONT_SIZE + PADDING,
      width: view.getBounds().width,
    }
    if (this.isSelected) {
      painter.setFillColor(theme.channelItem.selectedBackground)
      painter.fillRect(Object.assign(bounds, {x: 0, y: 0}))
    } else if (this.hover) {
      painter.setFillColor(theme.channelItem.hoverBackground)
      painter.fillRect(Object.assign(bounds, {x: 0, y: 0}))
    }
    const attributes = {
      font: CHANNEL_TITLE_FONT,
      color: this.hover ? HOVER_COLOR : NORMAL_COLOR,
    }
    painter.drawText(this.title, bounds, attributes)
  }

  select(){
    this.isSelected = true
    this.view.schedulePaint()
  }

  deselect(){
  var err = this.getErrorObject()
  var caller_line = err.stack.split("\n")[4]
  var index = caller_line.indexOf("at ")
  var clean = caller_line.slice(index+2, caller_line.length)
  //console.log(`Deselected: ${clean}`)
    if(!this.isSelected)
      return
    this.isSelected = false
    this.view.schedulePaint()
  }

  getErrorObject(){
    try { throw Error('') } catch(err) { return err; }
  }


}

module.exports = ChannelTitle
