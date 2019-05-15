const fs = require('fs')
const config = JSON.parse(fs.readFileSync('settings.json', 'utf-8'))
const server = require('https').createServer({
  key: fs.readFileSync(config.certs.serverKey, 'utf-8'),
  cert: fs.readFileSync(config.certs.serverCert, 'utf-8')
})
const io = require('socket.io')(server)
const mongoose = require('mongoose')

mongoose.connect(config.dbURL, {useNewUrlParser: true})
mongoose.Promise = global.Promise
let db = mongoose.connection

db.on('error', () => {
  console.log('[ERROR] Cannot connect to MongoDB server')
})

let channelSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Messages'
  }]
})

let messagesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  id: String,
  user_id: String,
  username: String,
  content: String,
  time: String,
  channel: String,
  state: Object
})

let Channel = mongoose.model('Channels', channelSchema)
let Message = mongoose.model('Messages', messagesSchema)

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

server.listen(config.port, (err) => {
  if (err) throw err
  console.log('Starting server...\nServer info => https://0.0.0.0:' + config.port + '/')
})
