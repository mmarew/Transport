// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// dotenv.config();
// import { pool, createTable } from "./Database.js";
// import jwt from "jsonwebtoken";
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { pool, createTable } = require("./Database.js");
const jwt = require("jsonwebtoken");
// const { default: Login } = require("../DriversPanel/src/Drivers/Login.js");
const app = express();
const PORT = process.env.PASSANGERS_PORT || 3003;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
createTable();
let tokenKey = process.env.TOKENKEY,
  DATABASE = process.env.DATABASE,
  PASSWORD = process.env.PASSWORD,
  USER = process.env.USER,
  HOST = process.env.HOST,
  TOKENKEY = process.env.TOKENKEY,
  PASSANGERS_PORT = process.env.PASSANGERS_PORT;
let tokenkey = process.env.TOKENKEY;
app.post("/checkPassangersStatus", async (req, res) => {
  let token = req.body.token;
  let results = await checkMyCurrentStatus({ token, res });
});
let checkMyCurrentStatus = async ({ token, res }) => {
  if (
    token == null ||
    token == "null" ||
    token == undefined ||
    token == "undefined"
  ) {
    return res.json({ data: "Login first" });
  }
  let { userId } = jwt.verify(token, tokenkey);
  let amIRegistered = `select * from passengersdetail where userId='${userId}'`;
  let Available = false;
  await pool
    .query(amIRegistered)
    .then(([results]) => {
      console.log(results);
      if (results.length > 0) Available = true;
      else {
        Available = false;
        return res.json({ data: "login first" });
      }
    })
    .catch((error) => {
      Available = false;
      console.log(error);
      return res.json({ data: "error" });
    });
  if (!Available) return;

  let Check = `SELECT * FROM GUZO, DriversDetail WHERE passangersId = '${userId}'  AND status IN ('requestedByPassenger', 'acceptedByDriver','journeyStarted','journeyEnded','canceledByDriver') and (DriversDetail.driversId = GUZO.driversid or GUZO.driversid is null)`;

  let userStatus = "";
  let resData = {};
  await pool
    .query(Check)
    .then(([data]) => {
      if (data.length > 0) {
        userStatus = "on service";
        resData = { data: "on service", result: data };
      } else {
        userStatus = "no service";
        resData = { data: "no service", result: data };
      }
      res.json({ data: userStatus, result: data });
    })
    .catch((error) => {
      console.log(error);
      ({ data: "error" });
    });
  // console.log("resData", resData);
  return resData;
};
app.post("/sendMyLocationToServer", async (req, res) => {
  try {
    let { lat, lng, token, MyLocation } = req.body;
    console.log("MyLocation", MyLocation);
    let { userId } = jwt.verify(token, tokenkey);
    let responce = await checkMyCurrentStatus({ token });
    console.log("responce", responce);
    if (responce.data !== "no service") return;
    let insert = `insert into GUZO set passangersLAT=?,passangersLNG=?, status='requestedByPassenger',passangersId=?,passangersStandingAndDestination=?`,
      values = [lat, lng, userId, JSON.stringify(MyLocation)];
    pool
      .query(insert, values)
      .then(([data]) => {
        console.log("data", data);
        return res.json({ data: "inserted" });
      })
      .catch((error) => {
        console.log("error", error);
      });
    // res.json({ data: req.body });
  } catch (error) {
    console.log("error", error);
    res.json({ data: "error no 1" });
  }
});
let registerUsers = async (rowData) => {
  // console.log(rowDatq);
  let { name, email, phone, res } = rowData;
  console.log(name, email, phone);
  let insert = `insert into passengersTable set status='active'`;
  let insertId = 0;
  await pool
    .query(insert)
    .then(([data]) => {
      console.log(data.insertId);
      insertId = data.insertId;
    })
    .catch((error) => {
      console.log(error);
      return res.json({ data: "error" });
    });
  let insertDetailes = `insert into passengersdetail set userId=?, email=?,phoneNumber=?,fullName=?`;
  await pool
    .query(insertDetailes, [insertId, email, phone, phone])
    .then(([data]) => {
      let token = jwt.sign({ userId: insertId }, tokenkey);
      res.json({ data: "inserted", token: token });
    })
    .catch((error) => {
      console.log("error", error);
      res.json({ data: "error" });
    });
};
app.post("/registerUsers", (req, res) => {
  console.log("req.body", req.body);
  // return;
  let { name, email, phone } = req.body;
  let select = `select * from passengersdetail where phoneNumber ='${phone}' or email='${email}'`;
  pool
    .query(select)
    .then(([data]) => {
      // console.log(data);
      if (data.length == 0) {
        registerUsers({ name, email, phone, res });
      } else {
        res.json({ data: "alreadyRegistered" });
      }
    })
    .catch((error) => {
      console.log(error);
    });
});

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log(`Connected at port number ${PORT}`);
});

app.post("/login", (req, res) => {
  // console.log("@login", req.body);
  let { identifier, password } = req.body;
  console.log(identifier, password);
  let check = `select * from passengersdetail where phoneNumber='${identifier}' or email='${identifier}'`;

  pool
    .query(check)
    .then(([data]) => {
      console.log(data);
      if (data.length > 0) {
        let token = jwt.sign({ userId: data[0].userId }, tokenkey);
        res.json({ data: "success", token, tokenkey, userProfile: data });
      } else {
        res.json({ data: "Phone number / email is not registered." });
      }
    })
    .catch((error) => {
      console.log(error);
    });
});
app.post("/cancelPasangersRequest", (req, res) => {
  try {
    let { token, reason } = req.body;
    console.log(token);
    let { userId } = jwt.verify(token, tokenkey);
    let update = `update GUZO set status='canceledByPassenger',passangersCancilationCause='${reason}' where passangersId='${userId}' and status='requestedByPassenger' or status='acceptedByDriver' `;
    pool
      .query(update)
      .then(([results]) => {
        res.json({ message: "passangers reques is canceled " });
      })
      .catch((error) => {
        console.log("error", error);
        res.json({ data: "error 2" });
      });
  } catch (error) {}
  // res.json({ data: req.body });
});
app.get("/", (req, res) => {
  `<h1>it is passangers transport server  and working well</h1>TOKENKEY=${TOKENKEY},DATABASE=${DATABASE},PASSWORD=${PASSWORD},USER=${USER},HOST=${HOST},PASSANGERS_PORT=${PASSANGERS_PORT},PORT=${PORT}`;
});
app.post("/confirmDeliveryByPassangers", (req, res) => {
  let { guzoId, token, Status } = req.body;
  console.log("confirmDeliveryByPassangers", req.body, "token", token);
  if (token == "undefined" || token == undefined || token == "null") {
    return res.json({ data: "login first" });
  }
  let { userId } = jwt.verify(token, tokenkey);
  console.log("userId", userId);
  let confirmMessage = "";
  if (Status == "canceledByDriver") {
    confirmMessage = "CancilationBydriverConfirmedByPassangers";
  } else if (Status == "journeyEnded") {
    confirmMessage = "journeyEndedConfirmedByPassangers";
  }
  let update = `update  GUZO set status='${confirmMessage}' where guzoId='${guzoId}' and passangersId='${userId}'`;
  pool
    .query(update)
    .then(([Results]) => {
      res.json({ data: "updated" });
    })
    .catch((error) => {
      res.json({ data: "error", error: error });
    });
  // res.json({ data: req.body });
});
