let express = require("express");
let cors = require("cors");
let db = require("./Database.js");
let jwt = require("jsonwebtoken");
let app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
let { pool, dotenv, createTable } = db;
dotenv.config();
createTable();
let tokenKey = process.env.TOKENKEY,
  PORT = process.env.PORT,
  USER = process.env.USER;
(DATABASE = process.env.DATABASE),
  (PASSWORD = process.env.PASSWORD),
  (HOST = process.env.HOST),
  (TOKENKEY = process.env.TOKENKEY),
  (PASSANGERS_PORT = process.env.PASSANGERS_PORT);
app.listen(PORT, (error) => {
  if (error) return console.log(error);
  console.log(`server is running on port ${PORT}`);
});

app.post("/registerDrivers", async (req, res) => {
  let { email, fullName, phone } = req.body;
  let checkDriver = `select * from DriversDetail where email='${email}' or phoneNumber='${phone}'`;
  let insertId = 0;
  let Reserved = false;
  await pool
    .query(checkDriver)
    .then(async ([data]) => {
      console.log(data);
      if (data.length > 0) {
        console.log("opopopop");
        return res.json({ data: "email or phone is reserved before" });
      } else {
        let insert = `insert into DriversTable set status='active'`;
        await pool
          .query(insert)
          .then((data) => {
            console.log(data);
            insertId = data[0].insertId;
            let insertIntoDetails = `insert into DriversDetail set driversId='${insertId}' , email='${email}', phoneNumber='${phone}' , DriversFullName='${fullName}'`;
            pool
              .query(insertIntoDetails)
              .then(([data]) => {
                loginDrivers("", phone, res);
                console.log(data);
                // let token = jwt.sign({ userId: insertId }, tokenKey);
                // return res.json({ data: "inserted successfully", token });
              })
              .catch((error) => {
                res.json({ data: "error 91", error });
                console.log("error is == ", error);
              });
          })
          .catch((error) => {
            console.log("error in register driver", error);
            res.json({ data: "error 92" });
          });
      }
    })
    .catch((error) => {
      console.log(error);
    });
});
let checkDriversStatus = async (userId) => {
  // checkDriversStatus will be out sourced
  let select = `select * from GUZO ,passengersdetail where userId=passangersId and  driversid='${userId}' and status in('acceptedByDriver','journeyStarted')`;
  let responces = "";
  await pool
    .query(select)
    .then(([result]) => {
      if (result.length > 0) {
        console.log(result);
        responces = {
          data: "Driver is with customer",
          result: result,
        };
        return;
      }
      responces = { data: "Driver can start job" };
    })
    .catch((error) => {
      responces = { data: "error" };
      console.log(error);
    });
  return responces;
};
app.post("/checkDriversStatus", async (req, res) => {
  try {
    let { token } = req.query;
    // console.log("req.query", req.query);
    // return;
    if (
      token == "undefined" ||
      token == undefined ||
      token == null ||
      token == "null"
    ) {
      return res.json({ data: "login first" });
    }
    let { userId } = jwt.verify(token, tokenKey);
    let results = await checkDriversStatus(userId);
    // console.log("result", result);
    let { data, result } = results;
    res.json({ data, result });
  } catch (error) {
    res.json({ data: "error no 90", error: error });
    console.log("error", "error no 90", error);
  }
  // res.json({ data: req.body });
});
let loginDrivers = (password, username, res) => {
  let select = `select * from DriversDetail where email='${username}' or phoneNumber='${username}'`;
  pool
    .query(select)
    .then(([data]) => {
      if (data.length > 0) {
        console.log(data[0].id);
        let id = data[0].id;
        console.log("id", id);
        let token = jwt.sign({ userId: id }, tokenKey);
        return res.json({ token, data: `login success`, userProfile: data });
      } else {
        res.json({ data: `Phone or email not exists` });
      }
    })
    .catch((error) => {
      console.log(error);
    });
};
app.post("/loginDrivers", (req, res) => {
  let { password, username } = req.body;
  loginDrivers(password, username, res);
});
app.post("/checkIfPassangerRequestedTaxi", async (req, res) => {
  let { token } = req.body;
  let { userId } = jwt.verify(token, tokenKey);
  let { data } = (results = await checkDriversStatus(userId));

  if (data == "Driver is with customer") {
    return res.json({ data: results });
  }
  let CurrentStatus = "";
  let select = `select * from GUZO,passengersdetail where status = 'requestedByPassenger' and userId=passangersId`;
  pool
    .query(select)
    .then(([data]) => {
      console.log(data);
      if (data.length > 0)
        res.json({ data: "customer is available", result: data });
      else {
        res.json({ data: "customer is not available" });
      }
    })
    .catch((error) => {
      console.log(error);
      console.log(res.json({ data: "error" }));
    });
});
app.post("/aceptCustomersCall", (req, res) => {
  let { token, guzoId } = req.body;
  if (
    token == null ||
    token == "undefined" ||
    token == undefined ||
    token == "null"
  )
    return res.json({ data: "login first" });
  let { userId } = jwt.verify(token, tokenKey);
  let update = `update GUZO set status = 'acceptedByDriver', driversId='${userId}' where guzoId='${guzoId}'`;
  pool
    .query(update)
    .then(([data]) => {
      console.log(data);
      if (data.affectedRows > 0) return res.json({ data: "updated well" });
      else res.json({ data: "no data found" });
    })
    .catch((error) => {
      console.log(error);
      return res.json({ data: "error" });
    });
});
app.post("/startJourney", (req, res) => {
  let { token, guzoId } = req.body;
  let { userId } = jwt.verify(token, tokenKey);
  let update = `update GUZO set status='journeyStarted' where status='acceptedByDriver' and driversId='${userId}' and guzoId='${guzoId}'`;
  pool
    .query(update)
    .then(([results]) => {
      console.log(results);
      if (results.affectedRows > 0) res.json({ data: "journeyStarted" });
      else {
        res.json({ data: "canotBejourneyStarted" });
      }
    })
    .catch((error) => {
      console.log(error);
    });
});
app.post("/arrivedIndestination", (req, res) => {
  let { token, guzoId } = req.body;
  let { userId } = jwt.verify(token, tokenKey);
  let update = `update GUZO set status='journeyEnded' where guzoId='${guzoId}' and driversId='${userId}'`;
  pool
    .query(update)
    .then(([data]) => {
      if (data.affectedRows > 0) res.json({ data: "journeyEnded" });
      else {
        res.json({ data: "data not found" });
      }
      console.log(data);
    })
    .catch((error) => {
      console.log(error);
      res.json({ data: "error" });
    });
});
app.get("/", (req, res) => {
  res.send(
    `<h1>it is transport server  and working well</h1>TOKENKEY=${TOKENKEY},DATABASE=${DATABASE},PASSWORD=${PASSWORD},USER=${USER},HOST=${HOST},PASSANGERS_PORT=${PASSANGERS_PORT},PORT=${PORT}`
  );
});
app.post("/cancelJourneyByDriver", (req, res) => {
  let { token, guzoId } = req.body;
  let { userId } = jwt.verify(token, tokenKey);
  // res.json({ userId });
  let update = `update GUZO set status='canceledByDriver' where guzoId='${guzoId}' and driversId='${userId}' `;
  pool
    .query(update)
    .then((data) => {
      console.log(data);
      res.json({ data: "updated successfully" });
    })
    .catch((error) => {
      res.json({ data: "error" });
      console.log(error);
    });
});
// here in case of before start journy it should verify  customer is still with driver
app.post("/verifyIfCustomerIsNotWithOtherDriver", (req, res) => {
  let { guzoId, token } = req.body.data;
  let { userId } = jwt.verify(token, tokenKey);
  console.log("guzoId", guzoId);
  let select = `select * from GUZO where  guzoId = '${guzoId}'`;
  // return res.json({ Message: req.body });
  pool.query(select).then(([results]) => {
    console.log("results", results);
    let { status, driversId } = results[0];
    if (results.length > 0) {
      if (status == "requestedByPassenger")
        res.json({
          Message: "it can connect with you",
          results: results,
          guzoId,
        });
      else if (status == "canceledByPassenger") {
        return res.json({
          Message: "it is cancelled by customer.",
          results: results,
          guzoId,
        });
      } else if (
        status == "acceptedByDriver" ||
        status == "canceledByDriver" ||
        status == "journeyStarted" ||
        status == "journeyEnded"
      ) {
        if (userId == driversId) {
          res.json({
            Message: "it can connect with you",
            results: results,
            guzoId,
          });
        } else {
          res.json({
            Message: "it is connected with other driver",
            results: results,
            guzoId,
          });
        }
      }
    } else {
      res.json({
        Message: "This journey is canceled by system",
        results,
        guzoId,
      });
    }
  });
});
