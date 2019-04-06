require("./config/config");

const _ = require("lodash");
const express = require("express");
const bodyParser = require("body-parser");
const { ObjectID } = require("mongodb");

var { DynamicObject } = require("./models/dynamic.object");
var { User } = require("./models/user");
var { authenticate } = require("./middleware/authenticate");

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.post("/thing", authenticate, (req, res) => {
  var thing = new DynamicObject({
    text: req.body.text,
    _creator: req.user._id
  });

  thing.save().then(
    doc => {
      res.send(doc);
    },
    e => {
      res.status(400).send(e);
    }
  );
});

app.get("/thing", authenticate, (req, res) => {
  DynamicObject.find({
    _creator: req.user._id
  }).then(
    thing => {
      res.send({ thing });
    },
    e => {
      res.status(400).send(e);
    }
  );
});

app.get("/thing/:id", authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  DynamicObject.findOne({
    _id: id,
    _creator: req.user._id
  }).then(
    thing => {
      if (!thing) {
        return res.status(404).send();
      }
      res.send({ thing });
    },
    e => {
      res.status(400).send();
    }
  );
});

app.delete("/thing/:id", authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  DynamicObject.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  }).then(
    thing => {
      if (!thing) {
        return res.status(404).send();
      }

      res.status(200).send({ thing });
    },
    e => {
      return res.status(400).send();
    }
  );
});

app.patch("/thing/:id", authenticate, (req, res) => {
  var id = req.params.id;
  var body = _.pick(req.body, ["properties"]);

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  DynamicObject.findOneAndUpdate(
    {
      _id: id,
      _creator: req.user._id
    },
    { $set: body },
    { new: true }
  )
    .then(thing => {
      if (!thing) {
        return res.status(404).send();
      }
      res.send({ thing });
    })
    .catch(e => {
      res.status(400).send();
    });
});

app.post("/users", (req, res) => {
  var body = _.pick(req.body, ["email", "password"]);

  var user = new User(body);

  user
    .save()
    .then(() => {
      return user.generateAuthToken();
    })
    .then(token => {
      res.header("x-auth", token).send(user);
    })
    .catch(e => {
      res.status(400).send(e);
    });
});

app.get("/users/me", authenticate, (req, res) => {
  res.send(req.user);
});

app.post("/users/login", (req, res) => {
  var body = _.pick(req.body, ["email", "password"]);

  User.findByCredentials(body.email, body.password)
    .then(user => {
      return user.generateAuthToken().then(token => {
        res.header("x-auth", token).send(user);
      });
    })
    .catch(e => {
      res.status(400).send();
    });
});

app.delete("/users/me/token", authenticate, (req, res) => {
  req.user.removeToken(req.token).then(
    () => {
      res.send(200);
    },
    () => {
      res.send(400);
    }
  );
});

app.listen(port, () => {
  console.log(`Started on port ${port}`);
});

module.exports = { app };
