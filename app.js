const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");

let database = null;

const userDetails = "JoeBiden";

const initialiseDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at 3000");
    });
  } catch (e) {
    console.log(`Error ${e.message}`);
    process.exit(1);
  }
};

initialiseDbAndServer();

const authenticateToken = (request, response, next) => {
  let JWTToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    JWTToken = authHeader.split(" ")[1];
  }
  if (JWTToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(JWTToken, "SECRET", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const validatePassword = (query) => {
  return query.length >= 6;
};

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 15);
  const registerUserQuery = `SELECT * FROM user WHERE username="${username}"`;
  const userInfo = await database.get(registerUserQuery);
  if (userInfo === undefined) {
    const postUser = `INSERT INTO user (username,password,name,gender) VALUES ("${username}","${hashedPassword}","${name}","${gender}")`;
    if (validatePassword(password)) {
      await database.run(postUser);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = "${username}"`;
  const userInfo = await database.get(getUserQuery);
  if (userInfo === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, userInfo.password);
    if (isPasswordMatched === true) {
      const payLoad = { username: username };
      const JWTToken = jwt.sign(payLoad, "SECRET");
      response.send({ jwtToken: JWTToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed", authenticateToken, async (request, response) => {
  const getNames = `SELECT name from follower inner join user on user.user_id =follower.following_user_id where follower_user_id="2"`;
  const nameDetails = await database.all(getNames);
  response.send(nameDetails);
});

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const getNames = `SELECT tweet,count(like_id) as likes,count(reply_id) as replies,date_time as dateTime from tweet inner join like on tweet.tweet_id = like.tweet_id inner join reply on tweet.tweet_id=reply.tweet_id where tweet.user_id=2`;
  const nameDetails = await database.all(getNames);
  response.send(nameDetails);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const getNames = `SELECT name from follower inner join user on user.user_id =follower.following_user_id where follower_user_id="2"`;
  const followingDetails = await database.all(getNames);
  response.send(followingDetails);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const getNames = `SELECT name from follower inner join user on user.user_id =follower.follower_user_id where following_user_id="2"`;
  const followerDetails = await database.all(getNames);
  response.send(followerDetails);
});

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const getNames = `SELECT tweet,count(like_id) as likes,count(reply_id) as replies,date_time as dateTime from tweet inner join like on tweet.tweet_id = like.tweet_id inner join reply on tweet.tweet_id=reply.tweet_id where tweet.user_id=2 and tweet.tweet_id=${tweetId} `;
  const nameDetails = await database.get(getNames);
  const { tweet } = nameDetails;
  if (tweet === null) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    response.send(nameDetails);
  }
});

app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getNames = `SELECT tweet,tweet_id from tweet where user_id=2 and tweet_id=${tweetId}`;
    const nameDetails = await database.all(getNames);
    if (nameDetails.length === 0) {
      response.status("401");
      response.send("Invalid Request");
    } else {
      response.send(nameDetails);
    }
  }
);

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getNames = `SELECT * from reply where user_id =2 and tweet_id=${tweetId}`;
    const nameDetails = await database.get(getNames);
    if (nameDetails === undefined) {
      response.status("401");
      response.send("Invalid Request");
    } else {
      response.send(nameDetails);
    }
  }
);

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet, userId, dateTime } = request.body;
  const getNames = `INSERT INTO tweet (tweet,user_id,date_time) VALUES ("${tweet}","${userId}","${dateTime}")`;
  const nameDetails = await database.run(getNames);
  response.send("Created a Tweet");
});

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const getNames = `SELECT tweet,tweet_id from tweet where user_id=2 and tweet_id=${tweetId}`;
    const nameDetails = await database.all(getNames);
    const valid = nameDetails.length === 0;
    if (nameDetails === undefined) {
      response.status("401");
      response.send("Invalid Request");
    } else {
      const deleteName = `DELETE FROM tweet where tweet_id=${tweetId}`;
      const runDelete = await database.run(deleteName);
      response.send("Tweet Removed");
    }
  }
);

module.exports = app;
