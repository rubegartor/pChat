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
    this.image = null
    this.file = null
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
    var datetime = new Date(this.time)
    var time = ('0' + datetime.getHours()).slice(-2) + ':' + ('0' + datetime.getMinutes()).slice(-2)

    var container =  $('<div>').addClass('message-container')
    var header = $('<div>').addClass('message-header')
    var message = $('<div>').addClass('message')
    var line = $('<span>').addClass('message-line').text(this.content).attr({user_id: this.user_id, id: this.id, datetime: this.time})
    header.append($('<span>').addClass('message-username').text(this.username))
    header.append($('<span>').addClass('message-time').text(time))
    if(this.image != null){
      var image = $('<img>').attr({id: this.id, src: 'data:image/jpeg;base64,' + this.image}).addClass('imageMsg')
      var imageContainer = $('<span>').attr({user_id: this.user_id, id: this.id, datetime: this.time}).append(image)
      image.on('load', function() {
        funcs.scroll()
      })
      message.append(imageContainer)
    }else{
      message.append(line)
    }
    container.append(header)
    container.append(message)

    return container
  }

  toAppend(){
    var toRet = null
    if(this.image != null){
      var image = $('<img>').attr({id: this.id, src: 'data:image/jpeg;base64,' + this.image}).addClass('imageMsg')
      var imageContainer = $('<span>').attr({user_id: this.user_id, id: this.id, datetime: this.time}).append(image)
      image.on('load', function() {
        funcs.scroll()
      })
      toRet = imageContainer
    }else{
      toRet = $('<span>').addClass('message-line').text(this.content).attr({user_id: this.user_id, id: this.id})
    }

    funcs.scroll()
    return toRet
  }

  get edited(){
    return state.edited
  }
}