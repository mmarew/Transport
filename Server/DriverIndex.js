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
let tokenKey = process.env.TOKENKEY;
let PORT = process.env.PORT;
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
                console.log(data);
                let token = jwt.sign({ userId: insertId }, tokenKey);
                res.json({ data: "inserted successfully", token });
              })
              .catch((error) => {
                res.json({ data: "error 91" });
                console.log(error);
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
app.post("/checkDriversStatus", (req, res) => {
  try {
    let { token } = req.query;
    console.log("req.query", req.query);
    // return;
    if (token == "undefined" || token == undefined) {
      return res.json({ data: "login first" });
    }
    let { userId } = jwt.verify(token, tokenKey);
    let select = `select * from GUZO ,passengersdetail where userId=passangersId and  driversid='${userId}' and status in('acceptedByDriver','journeyStarted')`;
    pool
      .query(select)
      .then(([result]) => {
        if (result.length > 0) {
          console.log(result);
          return res.json({ data: "Driver is with customer", result: result });
        }
        res.json({ data: "Driver can start job" });
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    res.json({ data: "error no 90" });
    console.log("error", "error no 90", error);
  }
  // res.json({ data: req.body });
});
app.post("/loginDrivers", (req, res) => {
  // {
  //   password: "marew123";
  //   username: "+251922112480";
  // }
  let { password, username } = req.body;
  let select = `select * from DriversDetail where email='${username}' or phoneNumber='${username}'`;
  pool
    .query(select)
    .then(([data]) => {
      if (data.length > 0) {
        console.log(data[0].id);
        let id = data[0].id;
        console.log("id", id);
        let token = jwt.sign({ userId: id }, tokenKey);
        return res.json({ token, data: `login success` });
      } else {
        res.json({ data: `Phone or email not exists` });
      }
    })
    .catch((error) => {
      console.log(error);
    });
  // res.json({ data: req.body });
});
app.post("/checkIfPassangerRequestedTaxi", (req, res) => {
  let { token } = req.body;
  let { userId } = jwt.verify(token, tokenKey);
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
  // res.json({ data: req.body });
  let { token, guzoId } = req.body;
  let { userId } = jwt.verify(token, tokenKey);
  let update = `update GUZO set status='acceptedByDriver', driversId='${userId}' where guzoId='${guzoId}'`;
  pool
    .query(update)
    .then((data) => {
      console.log(data);
      return res.json({ data: "updated well" });
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
  res.send("<h1>it is transport server  and working well</h1>");
});
