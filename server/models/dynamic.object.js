var mongoose = require("mongoose");

var dynamicObjectSchema = mongoose.Schema({
  _creator: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  properties: [{}]
});

var DynamicObject = mongoose.model(
  'DynamicObject',
  dynamicObjectSchema
);

module.exports = { DynamicObject };
