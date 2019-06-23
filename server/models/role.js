var mongoose = require('mongoose')

let rolesSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  permissions: Object
})

let Role = mongoose.model('Roles', rolesSchema)

module.exports = Role