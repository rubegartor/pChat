const $ = require('jquery')
const vars = require('./vars')

module.exports = class Channel{
  constructor(name){
    this.name = name
  }

  create(){
    vars.socket.emit('createChannel', this)
  }

  remove(){
    vars.socket.emit('removeChannel', this)
  }

  toHTML(){
    return $('<li>').text(this.name)
  }
}