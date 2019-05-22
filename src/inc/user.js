const io = require('socket.io-client')
const vars = require('./vars')

module.exports = class User{
  constructor(user_id, username, password){
    this.user_id = user_id
    this.username = username
    this.password = password
    this.status = 'offline'
  }

  login(){
    const socketOptions = {
      secure: true,
      reconnect: true,
      rejectUnauthorized : false //INFO: Si el certificado es self-signed necesitas utilizar rejectUnauthorized = false, por lo tanto se queda expuesto a un posible ataque MiTM
    }

    vars.socket = io.connect('https://localhost:1234', socketOptions)
    require('../inc/io-listener')()

    vars.socket.emit('loginRequest', this)
  }

  getStatus(){
    vars.socket.emit()
  }
}
