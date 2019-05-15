const server = require('http').createServer()
const io = require('socket.io')(server)
const fs = require('fs')
const minimist = require('minimist')
const mongoose = require('mongoose')

argv = minimist(process.argv.slice(2))
let port = 1234

mongoose.connect('mongodb://127.0.0.1/pChat', {useNewUrlParser: true})
mongoose.Promise = global.Promise
let db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB connection error:'))

var sch_channel = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Messages'
  }]
})

var sch_messages = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  id: String,
  user_id: String,
  username: String,
  content: String,
  time: String,
  channel: String,
  state: Object
})

var Channel = mongoose.model('Channels', sch_channel)
var Message = mongoose.model('Messages', sch_messages)

io.on('connection', (client) => {
  console.log('User connected (' + client.id + ')')

  Channel.find().populate('messages').exec((err, item) => {
    io.to(client.id).emit('setChannels', item)
  })

  client.on('message', (message) => {
    var msg = new Message({
      _id: new mongoose.mongo.ObjectId(),
      id: message.id,
      user_id: message.user_id,
      username: message.username,
      content: message.content,
      time: message.time,
      channel: message.channel,
      state: message.state
    })

    msg.save((err) => {
      if(err) return console.error(err)
    })

    Channel.updateOne({name: message.channel}, {$push: {messages: msg._id}}).exec()

    io.emit('messageResponse', message)
  })

  client.on('getChannelMessages', (channel) => {
    Channel.findOne({name: channel}).populate('messages').exec((err, item) => {
      io.to(client.id).emit('getChannelMessagesResponse', item)
    })
  })

  client.on('removeMessage', (message) => {
    Message.deleteOne({id: message.id}).exec()

    io.emit('removeMessageResponse', message)
  })

  client.on('createChannel', (channel) => {
    var chn = new Channel({
      _id: new mongoose.mongo.ObjectId(),
      name: channel.name,
      messages: []
    })

    chn.save((err) => {
      if(err) return console.error(err)
    })

    io.emit('createChannelResponse', channel)
  })

  client.on('removeChannel', (channel) => {
    Channel.deleteOne({name: channel.name}).exec()
    io.emit('removeChannelResponse', channel)
  })

  client.on('disconnect', () => {
    console.log('Client disconnected: ', client.id)
  })

  client.on('error', (err) => {
    console.log('Error from client => ', client.id)
    console.log(err)
  })
})

if(argv['p'] != undefined){
  port = argv['p']
}

server.listen(port, (err) => {
  if (err) throw err
  console.log('Starting server...')
  console.log('Server info => http://0.0.0.0:' + port + '/')
})
