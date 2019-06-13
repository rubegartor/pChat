const fs = require('fs')
const config = JSON.parse(fs.readFileSync('settings.json', 'utf-8'))
const server = require('https').createServer({
  key: fs.readFileSync(config.certs.serverKey, 'utf-8'),
  cert: fs.readFileSync(config.certs.serverCert, 'utf-8')
})
const io = require('socket.io')(server)
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const createDOMPurify = require('dompurify')
const { JSDOM } = require('jsdom')
const striptags = require('striptags')

const window = (new JSDOM('')).window
const DOMPurify = createDOMPurify(window)

const ObjectId = mongoose.Types.ObjectId; 

mongoose.connect(config.dbURL, {useNewUrlParser: true}) 
mongoose.Promise = global.Promise
let db = mongoose.connection

db.on('error', () => {
  console.log('[ERROR] Cannot connect to MongoDB server')
  process.exit(1)
})

let channelSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  position: Number,
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Messages'
  }],
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roles'
  }]
})

let messagesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  id: String,
  user_id: String,
  username: String,
  content: String,
  time: Number,
  channel: String,
  image: String,
  file: String,
  state: Object
})

let usersSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user_id: String, 
  username: String,
  password: String,
  status: Object,
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roles'
  }]
})

let rolesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  permissions: Object
})

let Channel = mongoose.model('Channels', channelSchema)
let Message = mongoose.model('Messages', messagesSchema)
let User = mongoose.model('Users', usersSchema)
let Role = mongoose.model('Roles', rolesSchema)

User.updateMany({status: 'online'}, {$set: {status: 'offline'}}).exec() //Set all offline clients to online on server startup

function getUsersOnline(){
  User.find().exec((err, users) => {
    io.emit('getUsersOnlineResponse', users)
  })
}

io.on('connection', (client) => {
  console.log('User connected (' + client.id + ')')

  client.on('loginRequest', (creds) => {
    User.findOne({username: creds.username}).exec((err, user) => {
      if(user != null){
        bcrypt.compare(creds.password, user.password).then((res) => {
          if(res){
            User.findOne({username: creds.username}).populate({path: 'roles'}).exec((err, user) => {
              User.updateOne({username: creds.username}, {$set: {'user_id': client.id}, 'status.main': 'online'}).exec(() => {
                io.to(client.id).emit('loginRequestResponse', {'status': 'ok', 'username': creds.username, 'user_status': user.status, 'roles': user.roles})
              })
            })
          }else{
            io.to(client.id).emit('loginRequestResponse', {'status': 'err', message: 'La contraseña no es correcta'})
          }
        })
      }else{
        io.to(client.id).emit('loginRequestResponse', {'status': 'err', message: 'El usuario no existe'})
      }
    })
  })

  client.on('getChannels', () => {
    User.findOne({'user_id': client.id}).exec((err, user) => {
      Channel.find({permissions: {$in: user.roles}}).exec((err, channels) => {
        io.to(client.id).emit('setChannels', channels)
      })
    })   
  })

  client.on('joinChannel', (channel) => {
    Object.keys(client.rooms).forEach((el) => {
      if(el != client.id){
        client.leave(el)
      }
    })
    client.join(channel.name)
  })

  client.on('getChannelMessages', (channel) => {
    Channel.findOne({name: channel}).populate({path:'messages', options: {limit: 20, sort: {_id: -1}}}).exec((err, item) => {
      io.to(client.id).emit('getChannelMessagesResponse', item)
    })
  })

  client.on('message', (message) => {
    var finalMessage = DOMPurify.sanitize(striptags(message.content, ['u', 'i', 'b']))
    var haveText = DOMPurify.sanitize(striptags(message.content)).length

    var msg = new Message({
      _id: new mongoose.mongo.ObjectId(),
      id: message.id,
      user_id: message.user_id,
      username: message.username,
      content: finalMessage,
      time: message.time,
      channel: message.channel,
      state: message.state,
      file: message.file,
      image: message.image
    })

    msg.save((err) => {
      if(err) return console.error(err)
    })

    Channel.updateOne({name: message.channel}, {$push: {messages: msg._id}}).exec()

    if((finalMessage.trim().length > 0 && haveText > 0) || message.image != null){
      message.content = finalMessage
      io.in(message.channel).emit('messageResponse', message)
    }
  })

  client.on('removeMessage', (message) => {
    Message.deleteOne({id: message.id}).exec()

    io.emit('removeMessageResponse', message)
  })

  client.on('createChannel', (channel) => {
    Channel.findOne({name: channel.name}).exec((err, item) => {
      if(item == null){
        var chn = new Channel({
          _id: new mongoose.mongo.ObjectId(),
          name: channel.name,
          position: channel.position,
          messages: []
        })
    
        chn.save((err) => {
          if(err) return console.error(err)
        })
    
        io.emit('createChannelResponse', {'status': 'ok', 'data': channel})
      }else{
        io.emit('createChannelResponse', {'status': 'err', 'msg': 'El canal ya existe'})
      }
    })
  })

  client.on('removeChannel', (channel) => {
    Channel.deleteOne({name: channel.name}).exec()
    io.emit('removeChannelResponse', channel)
  })

  client.on('editChannel', (data) => {
    Channel.findOne({name: '#' + data.newChannel.name}).exec((err, item) => {
      if(item == null){
        data.status = 'ok'
        data.toEdit = '#' + data.toEdit
        data.newChannel.name = '#' + data.newChannel.name
      }else{
        data.status = 'err'
      }

      Channel.updateOne({name: data.toEdit}, {$set: {'name': data.newChannel.name}}).exec(() => {
        io.emit('editChannelResponse', data)
      })
    })
  })

  client.on('getUsersOnline', () => {
    getUsersOnline()
  })

  client.on('updateUsernameStatus', (user) => {
    User.updateOne({user_id: client.id}, {$set: {'status': user.status}}).exec(() => {
      getUsersOnline()
    })
  })

  client.on('addRole', (data) => {
    Role.findOne({name: data.role.name}).exec((err, rl) => {
      if(rl != null){
        User.findOne({'user_id': data.user.user_id}).exec((err, userRoleData) => {
          if(!userRoleData.roles.includes(rl._id)){ //Se comprueba si el usuario ya tiene el rol para no duplicarlo
            User.updateOne({'user_id': data.user.user_id}, {$push: {roles: rl._id}}).exec(() => {
              io.to(data.user.user_id).emit('updateRoles', {action: 'add', role: rl})
            })
          }
        })
      }
    })
  })

  client.on('removeRole', (data) => {
    Role.findOne({name: data.role.name}).exec((err, rl) => {
      if(rl != null){
        User.updateOne({'user_id': data.user.user_id}, {$pull: {'roles': rl._id }}).exec(() => {
          io.to(data.user.user_id).emit('updateRoles', {action: 'remove', role: rl})
        })
      }
    })
  })

  client.on('disconnect', () => {
    User.updateOne({user_id: client.id}, {$set: {'status.main': 'offline'}}).exec(() => {
      getUsersOnline()
    })
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
