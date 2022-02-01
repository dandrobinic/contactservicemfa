const functions = require("firebase-functions");
const express = require("express");
const otpGenerator = require('./controllers/otpGeneratorController');
const getTenantInfo = require('./controllers/tenantController');

const otp = express();
const entrust = express();

otp.post('/',otpGenerator);
entrust.get('/',getTenantInfo)

exports.otp = functions.https.onRequest(otp);
exports.entrustclaro = functions.https.onRequest(entrust);

