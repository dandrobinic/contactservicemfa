const db = require('../config/firebase');
const admin = require('firebase-admin');
const functions = require("firebase-functions");
const axios = require('axios');
const { validationResult } = require('express-validator');

// Twilio Configuration
const accountSid = functions.config().twilio.accountsid;
const authToken = functions.config().twilio.authtoken;
const client = require('twilio')(accountSid, authToken);

function authenticate(adminApplicationId, sharedSecret) {
        return axios.post(
            'https://claro.us.trustedauth.com/api/web/v1/adminapi/authenticate',
            {
                "applicationId": adminApplicationId,
                "sharedSecret": sharedSecret
            },
            {
                headers: {
                    "Content-Type": "application/json",
                }
            }
        );
};

function createOTP(authToken,applicationId,userId,otpDeliveryType) {
    return axios.post(
        'https://claro.us.trustedauth.com/api/web/v1/otps', 
        {
            'applicationId': applicationId, 
            'returnOTP': true,
            "deliverOTP": otpDeliveryType == 'SMS' ? false : true,
            "otpDeliveryType": otpDeliveryType,
            'userId': userId,
        },
        {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }        
        
        }
    );
};

function getUserInfo(authToken,userId) {
    return axios.post(
        'https://claro.us.trustedauth.com/api/web/v3/users/userid', 
        {
            "userId": userId 
        },
        {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }        
        
        }
    );
};

const generateOTP = async (req, res) => {
    
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0].msg;
      return res.status(400).json({
            errorCode: 'invalid_argument_format',
            errorMessage: firstError,                
        });
    }

    const { adminApplicationId, sharedSecret, userId, applicationId } = req.body;
    try {
        const generateOTP = db.collection('generateOTP').doc();
        
        const generateOTPObject = {
            id: generateOTP.id,
            adminApplicationId,
            sharedSecret,
            userId,
            applicationId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Generation OTP Request Info and data is saved on Firestore Database
        generateOTP.set(generateOTPObject);
        
        // Authenticate to the Entrust Admin API Application
        const authenticateResponse = await authenticate(adminApplicationId,sharedSecret)
        .catch(error => {
            var errorCode = error.response.data.errorCode;
            if(errorCode == 'api_application_not_found'){
                res.status(404).send({
                    errorCode: errorCode,
                    errorMessage: 'Aplicación API administrativa no encontrada',                
                });
            }else if(errorCode == 'access_denied'){
                res.status(403).send({                
                    errorCode: errorCode,
                    errorMessage: 'Acceso Denegado',                
                });
            }else{
                res.status(500).send({                    
                    errorCode: 'internal_server_error',
                    errorMessage: 'Internal Server Error',                
                });
            } 
        });

        // Get the user info (mobile) from Entrust  
        const getUserInfoResponse = await getUserInfo(authenticateResponse.data.authToken,userId)
        .catch(error => {
            var errorCode = error.response.data.errorCode;
            if(errorCode == 'user_not_found'){
                res.status(404).send({
                    errorCode: errorCode,
                    errorMessage: 'Usuario no encontrado',
                });
            }else if(errorCode == 'invalid_session_token'){
                res.status(500).send({
                    errorCode: 'internal_server_error',
                    errorMessage: 'Internal Server Error',
                });
            }else{
                res.status(500).send({
                    errorCode: errorCode,
                    message: 'Internal Server Error',                
                });
            }
        });
        
        // Generates OTP from Entrust
        const createOTPResponse = await createOTP(authenticateResponse.data.authToken,applicationId,userId,"SMS")
        .catch(error => {
            var errorCode = error.response.data.errorCode;
            if(errorCode == 'application_not_found'){
                res.status(404).send({
                    errorCode: errorCode,
                    message: 'Aplicación de Autenticación no encontrada',
                });
            }else if(errorCode == 'invalid_session_token'){
                res.status(500).send({
                    errorCode: '',
                    message: 'Internal Server Error',
                });
            }else{
                res.status(500).send({
                    errorCode: errorMessage,
                    message: 'Internal Server Error',                
                });
            }
        });

        // Setting the name of the application that is being accessed 
        const sistema = (applicationId == '40935e0c-6ab8-4fa3-8b63-616a4565bef2') ? 'Poliedro' : 'Visor'; 
        
        // Sending the OTP to the final user via SMS
        try {
            
            //Via SMPP (PCA) 
            let phoneNumber = getUserInfoResponse.data.mobile;
            let message = 'Su codigo OTP para ingresar a ' + sistema + ' es el siguiente: ' + createOTPResponse.data.otp;            

            // Enviar request al servicio expuesto en la Maquina Virtual para envio de mensaje SMS por PCA (SMPP)        
            axios.post('http://10.128.0.4:3030/sendSmsViaSmpp',{
                message: message,
                phoneNumber: phoneNumber
            }).then((response) => {                                            
                res.status(201).json({
                    message: 'OTP successfully sent',
                    token: createOTPResponse.data.token,
                    expirationTime: createOTPResponse.data.exp,
                    smppResponse: response.data
                })
            }).catch(function (error) {           
                console.log(error); 
                res.status(403).json({
                    status: error.message,
                });
            }) .then(function () {
                // always executed
            }); 

            //Via Twilio 
            // client.messages.create({
            //     body: 'Su codigo OTP para ingresar a ' + sistema + ' es el siguiente: ' + createOTPResponse.data.otp ,
            //     from: '+17655776014',
            //     to: getUserInfoResponse.data.mobile
            // })
            // .then(() =>
            //     res.status(201).send({
            //         message: 'OTP successfully created',
            //         token: createOTPResponse.data.token,
            //         expirationTime: createOTPResponse.data.exp,
            //     })
            // );    

        } catch (error) {
            res.status(500).json(error.message);
        }
    } catch (error) {
        res.status(500).json(error.message);
    }
}

module.exports = generateOTP;