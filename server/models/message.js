var mongoose = require('mongoose')

let messagesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  },
  content: String,
  time: Number,
  channel: String,
  image: String,
  file: String,
  state: Object
})

let Message = mongoose.model('Messages', messagesSchema)
module.exports = Message