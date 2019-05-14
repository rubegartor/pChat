const $ = require('jquery')
var vars = require('./vars')

module.exports = class Message{
  constructor(id, user_id, username, time, channel, content) {
    this.id = id
    this.user_id = user_id
    this.username = username
    this.content = content
    this.time = time
    this.channel = channel
    this.state = {edited: false}
  }

  send(){
    vars.socket.emit('message', this)
  }

  remove(){
    vars.socket.emit('removeMessage', this)
  }

  edit(newContent){
    this.content = newContent
  }

  toHTML(){
    var container =  $('<div>').addClass('message-container')
    var header = $('<div>').addClass('message-header')
    var message = $('<div>').addClass('message')
    var line = $('<span>').addClass('message-line').text(this.content).attr({user_id: this.user_id, id: this.id})
    header.append($('<span>').addClass('message-username').text(this.username))
    header.append($('<span>').addClass('message-time').text(this.time))
    message.append(line)
    container.append(header)
    container.append(message)

    return container
  }

  toAppend(){
    return $('<span>').addClass('message-line').text(this.content).attr({user_id: this.user_id, id: this.id})
  }

  get edited(){
    return state.edited
  }
}