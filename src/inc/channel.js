const $ = require('jquery')
const vars = require('./vars')

module.exports = class Channel{
  constructor(name){
    this.name = name
    this.position = 0
  }

  create(chnPos){
    this.position = chnPos
    vars.socket.emit('createChannel', this)
  }

  remove(){
    vars.socket.emit('removeChannel', this)
  }

  join(){
    vars.socket.emit('joinChannel', this)
  }

  edit(newName){
    var channelName = this.name
    this.name = newName
    vars.socket.emit('editChannel', {toEdit: channelName, newChannel: this})
  }

  toHTML(){
    return $('<li>').text(this.name)
  }
}