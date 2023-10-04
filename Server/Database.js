const dotenv = require("dotenv");
dotenv.config();
let mysql = require("mysql2/promise");
const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  connectionLimit: 10, // Maximum number of connections in the pool
});
pool.getConnection();
let createTable = async () => {
  let DriversTable = `create table if not exists DriversTable (driversId INT PRIMARY KEY AUTO_INCREMENT, password varchar(45), passwordResetPin int, status varchar(40) not null default 'active')`;
  pool
    .query(DriversTable)
    .then((data) => console.log(data))
    .catch((error) => {
      console.log(error);
    });
  let DriversRegistration = `CREATE TABLE IF NOT EXISTS DriversDetail (id INT PRIMARY KEY AUTO_INCREMENT,driversId INT,DriversFullName varchar(80), plateNumber VARCHAR(255), email VARCHAR(255),phoneNumber VARCHAR(255), registrationDate DATE,FOREIGN KEY (driversId) REFERENCES DriversTable(driversId))`;
  pool
    .query(DriversRegistration)
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.log(error);
    });
  ////////////////////////////
  // this is passangers table
  let tableTransport = `CREATE TABLE IF NOT EXISTS GUZO (guzoId INT AUTO_INCREMENT PRIMARY KEY, passangersLAT FLOAT, passangersLNG FLOAT,  passangersId VARCHAR(900), driversLAT FLOAT,  driversLNG FLOAT, passangersStandingAndDestination varchar(900),  passangersCancilationCause varchar(300),driversId INT,status ENUM ( 'requestedByPassenger','acceptedByDriver','canceledByPassenger','canceledByDriver',  'journeyStarted','journeyEnded','journeyEndedConfirmedByPassangers',
  'CancilationBydriverConfirmedByPassangers','journeyEndedConfirmedByDriver'))`;
  pool
    .query(tableTransport)
    .then((data) => {
      // console.log("data", data);
    })
    .catch((error) => {
      console.log("error", error);
    });
  const passengersTable = `CREATE TABLE IF NOT EXISTS passengersTable (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  password VARCHAR(255),
  status VARCHAR(255),
  passwordresetPin VARCHAR(255)
)`;
  await pool
    .query(passengersTable)
    .then(([results]) => {
      // console.log("passengersTable created well", results);
    })
    .catch((error) => {
      console.log("error on passengersTable", error);
      console.log(error);
    });
  let passangersDetail = `CREATE TABLE IF NOT EXISTS passengersdetail (detailId int primary key auto_increment,fullName varchar(20), email VARCHAR(255),  phoneNumber VARCHAR(20),  userId INT,  FOREIGN KEY (userId) REFERENCES passengersTable(id))`;
  await pool
    .query(passangersDetail)
    .then((data) => {
      console.log("passengersdetail created well");
    })
    .catch((error) => {
      console.log("passengersdetail", error);
    });
};
module.exports = { pool, createTable, dotenv };
