const $ = require('jquery')
const vars = require('./vars')

module.exports = class Channel{
  constructor(name){
    this.name = name
  }

  create(){
    vars.socket.emit('createChannel', this)
  }

  toHTML(){
    return $('<li>').text(this.name)
  }
}