const io = require('socket.io-client')
const vars = require('./vars')
const Role = require('./role')

module.exports = class User{
  constructor(username){
    this.user_id = null
    this.username = username
    this.nickname = ''
    this.color = '#dce0eb'
    this.password = null
    this.status = 'offline'
    this.roles = []
  }

  addRole(name){
    vars.socket.emit('addRole', {user: vars.me, role: new Role(name)})
  }

  removeRole(name){
    vars.socket.emit('removeRole', {user: vars.me, role: new Role(name)})
  }

  login(options){
    var url = 'https://localhost:1234'
    const socketOptions = {
      secure: true,
      reconnect: true,
      rejectUnauthorized : false //INFO: Si el certificado es self-signed necesitas utilizar rejectUnauthorized = false, por lo tanto se queda expuesto a un posible ataque MiTM
    }

    if(Object.keys(options).length > 0){
      url = 'https://' + options.host + ':' + options.port
    }

    vars.socket = io.connect(url, socketOptions)
    require('../inc/io-listener')()

    vars.socket.emit('loginRequest', this)
  }

  updateStatus(){
    vars.socket.emit('updateUsernameStatus', this)
  }

  updateColor(newColor){
    vars.socket.emit('updateUsernameColor', {'newColor': newColor, 'user': new User(this.username)})
  }

  updateNickname(nickname){
    var user = new User(this.username)
    user.nickname = this.nickname
    vars.socket.emit('updateUsernameNickname', {'newNickname': nickname, 'user': user})
  }
}
