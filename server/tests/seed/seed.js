const { ObjectID } = require("mongodb");
const { DynamicObject } = require("../../models/dynamic.object");
const { User } = require("../../models/user");
const jwt = require("jsonwebtoken");

const userOneId = new ObjectID();
const userTwoId = new ObjectID();

const users = [
  {
    _id: userOneId,
    email: "andrew@example.com",
    password: "userOnePass",
    tokens: [
      {
        access: "auth",
        token: jwt
          .sign({ _id: userOneId, access: "auth" }, process.env.JWT_SECRET)
          .toString()
      }
    ]
  },
  {
    _id: userTwoId,
    email: "jen@example.com",
    password: "userTwoPass",
    tokens: [
      {
        access: "auth",
        token: jwt
          .sign({ _id: userTwoId, access: "auth" }, process.env.JWT_SECRET)
          .toString()
      }
    ]
  }
];

const things = [
  {
    _id: new ObjectID(),
    _creator: userOneId,
    properties: {
      atoms: ["H", "O", "O"]
    }
  },
  {
    _id: new ObjectID(),
    _creator: userTwoId,
    properties: {
      atoms: ["H", "O", "O"],
      state: ["liquid"]
    }
  }
];

const populateThings = done => {
  DynamicObject.remove({})
    .then(() => {
      DynamicObject.insertMany(things);
    })
    .then(() => done());
};

const populateUsers = done => {
  User.remove({})
    .then(() => {
      var userOne = new User(users[0]).save();
      var userTwo = new User(users[1]).save();

      return Promise.all([userOne, userTwo]);
    })
    .then(() => done());
};

module.exports = { things, populateThings, users, populateUsers };
