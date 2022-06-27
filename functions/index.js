const functions = require("firebase-functions");
const express = require("express");
const axios = require('axios');
const { check, body } = require('express-validator');
const otpGenerator = require('./controllers/otpGeneratorController');
const getTenantInfo = require('./controllers/tenantController');

const otp = express();
const dev = express();
const entrust = express();

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

// dev object created to export function to firebase for development purposes
dev.post('/otp',[
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
 
exports.otp = functions.https.onRequest(otp);
exports.dev = functions.https.onRequest(dev);
exports.entrustclaro = functions.https.onRequest(entrust);

// Sending the OTP on a SMS sent through PCA. Function for testing pourposes on 
exports.helloWorld = functions.https.onRequest((req, res) => {
    try {
        let message = req.body.message;
        let phoneNumber = req.body.phoneNumber;

        // Enviar request al servicio expuesto en la Maquina Virtualpara envio de mensaje SMS por PCA (SMPP)
        
        axios.post('http://10.128.0.4:3030/sendSmsViaSmpp',{
            message: message,
            phoneNumber: phoneNumber
        }).then((response) => {
            console.log(response.data);
            console.log(response.status);
            console.log(response.statusText);                
            res.status(200).send(response.data);
        }).catch(function (error) {           
            console.log(error); 
            res.status(403).json({
                status: error.message,
            });
        }) .then(function () {
            // always executed
        }); 
    }catch (error) {
        res.status(403).json({
            status: error.message,
        });
    }	
});
