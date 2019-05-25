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

  toHTML(){
    return $('<li>').text(this.name)
  }
}