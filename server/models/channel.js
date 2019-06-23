var mongoose = require('mongoose')

let channelSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  position: Number,
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Messages'
  }],
  requiredRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roles'
  }]
})

let Channel = mongoose.model('Channels', channelSchema)
module.exports = Channel