const expect = require("expect");
const request = require("supertest");

const { app } = require("../server");
const { DynamicObject } = require("../models/dynamic.object");
const { ObjectID } = require("mongodb");
const { things, populateThings, users, populateUsers } = require("./seed/seed");
const { User } = require("../models/user");

beforeEach(populateUsers);
beforeEach(populateThings);

describe("POST /thing", () => {
  it("should create a new thing", done => {
    var properties = { name: 'Miles', time: '17:19' };

    request(app)
      .post("/thing")
      .set("x-auth", users[0].tokens[0].token)
      .send({ properties })
      .expect(200)
      .expect(res => {
        expect(res.body.properties).toBe(properties);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        DynamicObject.find({ properties })
          .then(things => {
            expect(things.length).toBe(1);
            expect(things[0].properties).toBe(properties);
            done();
          })
          .catch(e => done(e));
      });
  });

  it("should not create a new thing with invalid body data", done => {
    request(app)
      .post("/thing")
      .set("x-auth", users[0].tokens[0].token)
      .send({})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        DynamicObject.find()
          .then(things => {
            expect(things.length).toBe(2);
            done();
          })
          .catch(e => done(e));
      });
  });
});

describe("GET /things", () => {
  it("should get all things", done => {
    request(app)
      .get("/things")
      .set("x-auth", users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body.things.length).toBe(1);
      })
      .end(done);
  });
});

describe("GET /things/:id", () => {
  it("should return a an object", done => {
    request(app)
      .get(`/things/${things[0]._id.toHexString()}`)
      .set("x-auth", users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body.thing.paramater).toBe(things[0].paramater);
      })
      .end(done);
  });

  it("should return a 404 if thing not found", done => {
    var hexId = new ObjectID().toHexString();
    request(app)
      .get(`/things/${hexId}`)
      .set("x-auth", users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it("should return a 404 for none-Object IDs", done => {
    request(app)
      .get("/things/123")
      .set("x-auth", users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it("should return a todo doc created by other user", done => {
    request(app)
      .get(`/things/${things[1]._id.toHexString()}`)
      .set("x-auth", users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe("DELETE /things/:id", () => {
  it("should remove a todo", done => {
    var hexId = things[1]._id.toHexString();

    request(app)
      .delete(`/things/${hexId}`)
      .set("x-auth", users[1].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body.todo._id).toBe(hexId);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.findById(hexId)
          .then(todo => {
            expect(todo).toBeFalsy();
            done();
          })
          .catch(e => done(e));
      });
  });
  it("should return 404 if todo not found", done => {
    var hexId = new ObjectID().toHexString();
    request(app)
      .get(`/things/${hexId}`)
      .set("x-auth", users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it("should return 404 if ObjectID is invalid", done => {
    request(app)
      .get("/things/123")
      .set("x-auth", users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it("should not remove another user's todo", done => {
    var hexId = things[0]._id.toHexString();

    request(app)
      .delete(`/things/${hexId}`)
      .set("x-auth", users[1].tokens[0].token)
      .expect(404)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        DynamicObject.findById(hexId)
          .then(thing => {
            expect(thing).toBeTruthy();
            done();
          })
          .catch(e => done(e));
      });
  });
});

describe("PATCH /things/:id", () => {
  it("should update the todo", done => {
    var hexId = things[0]._id.toHexString();
    var text = "Pet the kitty";
    request(app)
      .patch(`/things/${hexId}`)
      .set("x-auth", users[0].tokens[0].token)
      .send({ text: text, completed: true })
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(true);
        expect(typeof res.body.todo.completedAt).toBe("number");
      })
      .end(done);
  });

  it("should not update another user's todo", done => {
    var hexId = things[0]._id.toHexString();
    var text = "Pet the kitty";
    request(app)
      .patch(`/things/${hexId}`)
      .set("x-auth", users[1].tokens[0].token)
      .send({ text: text, completed: true })
      .expect(404)
      .end(done);
  });

  it("should clear completedAt when todo is not completed", done => {
    var hexId = things[1]._id.toHexString();
    var text = "Feed the fishies";
    request(app)
      .patch(`/things/${hexId}`)
      .set("x-auth", users[1].tokens[0].token)
      .send({ text: text, completed: false, completedAt: null })
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(false);
        expect(res.body.todo.completedAt).toBeFalsy();
      })
      .end(done);
  });
});

describe("GET /users/me", () => {
  it("should return user if authenticated", done => {
    request(app)
      .get("/users/me")
      .set("x-auth", users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body._id).toBe(users[0]._id.toHexString());
        expect(res.body.email).toBe(users[0].email);
      })
      .end(done);
  });

  it("should return 401 if not authenticated", done => {
    request(app)
      .get("/users/me")
      .set("x-auth", "")
      .expect(401)
      .expect(res => {
        expect(res.body).toEqual({});
      })
      .end(done);
  });
});

describe("POST /users", () => {
  it("should create a user", done => {
    var email = "email@example.com";
    var password = "amb123pass";

    request(app)
      .post("/users")
      .send({ email, password })
      .expect(200)
      .expect(res => {
        expect(res.headers["x-auth"]).toBeTruthy();
        expect(res.body._id).toBeTruthy();
        expect(res.body.email).toBe(email);
      })
      .end(err => {
        if (err) {
          return done(err);
        }
        User.findOne({ email })
          .then(user => {
            expect(user).toBeTruthy();
            expect(user.password).not.toBe(password);
            done();
          })
          .catch(e => done(e));
      });
  });

  it("should return validation errors if request invalid", done => {
    var email = "sumDimSum@com";
    var password = "12345";
    request(app)
      .post("/users")
      .send({ email, password })
      .expect(400)
      .end(done);
  });

  it("should not create user if email is in use", done => {
    var email = users[0].email;
    var password = "123456";
    request(app)
      .post("/users")
      .send({ email, password })
      .expect(400)
      .end(done);
  });
});

describe("POST /users/login", () => {
  it("should login user and return auth token", done => {
    request(app)
      .post("/users/login")
      .send({
        email: users[1].email,
        password: users[1].password
      })
      .expect(200)
      .expect(res => {
        expect(res.headers["x-auth"]).toBeTruthy();
      })
      .end((err, res) => {
        if (err) {
          done(err);
        }
        User.findById(users[1]._id)
          .then(user => {
            expect(user.toObject().tokens[1]).toMatchObject({
              access: "auth",
              token: res.header["x-auth"]
            });
            done();
          })
          .catch(e => done(e));
      });
  });

  it("should reject invalid login", done => {
    request(app)
      .post("/users/login")
      .send({
        email: users[1].email,
        password: "aGuess1234"
      })
      .expect(400)
      .expect(res => {
        expect(res.headers["x-auth"]).toBeFalsy();
      })
      .end((err, res) => {
        if (err) {
          done(err);
        }
        User.findById(users[1]._id)
          .then(user => {
            expect(user.tokens.length).toBe(1);
            done();
          })
          .catch(e => done(e));
      });
  });
});

describe("DELETE /users/me/token", () => {
  it("should remove auth token on logout", done => {
    request(app)
      .delete("/users/me/token")
      .set("x-auth", users[0].tokens[0].token)
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
        }
        User.findById(users[0]._id)
          .then(user => {
            expect(user.tokens.length).toBe(0);
            done();
          })
          .catch(e => done(e));
      });
  });
});
