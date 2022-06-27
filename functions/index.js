const functions = require("firebase-functions");
const express = require("express");
const { check, body } = require('express-validator');
const otpGenerator = require('./controllers/otpGeneratorController');
const getTenantInfo = require('./controllers/tenantController');

const otp = express();

otp.post('/',[
    check('adminApplicationId')
        .exists().withMessage('adminApplicationId is required')
        .isString().withMessage('adminApplicationId must be a string')
        .equals('0d8c2665-5feb-4f32-bc85-a0112f583f4c').withMessage('Invalid adminApplicationId'),
    check('sharedSecret')
        .exists().withMessage('sharedSecret is required')
        .isString().withMessage('sharedSecret must be a string')
        .equals('7bqn0l6J-g8pdcmVGqWnJBGNKQDHH-JfEEFfqfTE0SY').withMessage('Invalid sharedSecret'),
    check('userId')
        .exists().withMessage('userId is required')
        .isString().withMessage('userId must be a string'),
    check('applicationId')
        .exists().withMessage('applicationId is required')
        .isString().withMessage('applicationId must be a string')
        .isIn(['40935e0c-6ab8-4fa3-8b63-616a4565bef2', '95d39451-20e0-4819-931e-a0f3c7e30043']).withMessage('Invalid applicationId')
  ],otpGenerator);

entrust.get('/',getTenantInfo)

// ************ Exported Cloud Functions ************ //
 
//Production Functions
exports.otp = functions.https.onRequest(otp);
exports.entrustclaro = functions.https.onRequest(entrust);