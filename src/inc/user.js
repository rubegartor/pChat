const vars = require('./vars')

module.exports = class User{
  constructor(user_id, username, password){
    this.user_id = user_id
    this.username = username
    this.password = password
    this.status = 'offline'
  }

  login(){
    vars.socket.emit('loginRequest', this)
  }

  getStatus(){
    vars.socket.emit()
  }
}
