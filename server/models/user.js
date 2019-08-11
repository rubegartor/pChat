var mongoose = require('mongoose')

let usersSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user_id: String, 
  username: String,
  nickname: String,
  password: String,
  color: String,
  status: Object,
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roles'
  }]
})

let User = mongoose.model('Users', usersSchema)
module.exports = User