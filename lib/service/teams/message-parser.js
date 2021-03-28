
const emoji = require('./emoji.json')

function parseReaction(account, size, p1) {
  const custom = account.emoji[p1]
  if (custom)
    return `<span style="background-image: url(${custom})" class="custom size-${size} emoji"></span>`
  const data = emoji[p1]
  if (!data)
    return null
  if (p1.startsWith('skin-tone-'))
    return ''
  const x = data.x * size
  const y = data.y * size
  return `<span style="background-position: -${x}px -${y}px" class="apple size-${size} emoji"></span>`
}

function parseEmojiFromMessage(message, outbound) {
  if (!message && !message.body)
    return "";

  emojiConverter = {};
  require("./emoji")(emojiConverter);

  let text = message.body && message.body.content ? message.body.content : message;
  const { asciiRegexp, asciiList, jsEscapeMap, toImage, shortnameToUnicode } = emojiConverter;

  text = encodeURIs(text); // protect URLs from getting emoji'd
  const matches = text.match(new RegExp(asciiRegexp));
  if (matches)
    matches.forEach(ascii => {
      text = text.replace(ascii, emojiConverter.objectFlip(jsEscapeMap)[asciiList[ascii]]);
    })

  text = outbound ? shortnameToUnicode(text) : toImage(text);
  text = decodeURIComponent(decodeURI(text));

  return text;
}

function encodeURIs(text) {
  const expression = /(https|http|ftp|sftp):\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
  const regex = new RegExp(expression);
  const matches = text.match(regex);
  let newText = text;
  if (matches)
    matches.forEach(url => {
      newText = newText.replace(url, encodeURIComponent(encodeURI(url)));
    })
  return newText;
}

async function teamsMarkdownToHtml(text) {
  const atTagBegin = /<at id="[0-9]+">/g
  const atTagEnd = /<\/at>/g

  const hasMention = atTagBegin.test(text)
  const result = hasMention ?
    text
      .replace(atTagBegin, '<span class="broadcast at">@')
      .replace(atTagEnd, '</span>') :
    text

  return [hasMention, result]
}

module.exports = {parseReaction, parseEmojiFromMessage, teamsMarkdownToHtml}
