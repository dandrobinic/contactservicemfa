const db = require('../config/firebase');
const admin = require('firebase-admin');
const functions = require("firebase-functions");
const axios = require('axios');

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

function createOTP(authToken,authApplicationId,userId) {
    return axios.post(
        'https://claro.us.trustedauth.com/api/web/v1/otps', 
        {
            'applicationId': authApplicationId, 
            'returnOTP': true,
            "deliverOTP": false,
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
    const { adminApplicationId, sharedSecret, userId, authApplicationId } = req.body;
    try {
        const generateOTP = db.collection('generateOTP').doc();
        
        const generateOTPObject = {
            id: generateOTP.id,
            adminApplicationId,
            sharedSecret,
            userId,
            authApplicationId,
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
                    status: 'failure',
                    errorCode: errorCode,
                    message: 'Aplicación API administrativa no encontrada',                
                });
            }else if(errorCode == 'access_denied'){
                res.status(403).send({
                    status: 'failure',
                    errorCode: errorCode,
                    message: 'Acceso Denegado',                
                });
            }else{
                res.status(500).send({
                    status: 'failure',
                    errorCode: errorCode,
                    message: 'Internal Server Error',                
                });
            } 
        });

        // Get the user info (mobile) from Entrust  
        const getUserInfoResponse = await getUserInfo(authenticateResponse.data.authToken,userId)
        .catch(error => {
            var errorCode = error.response.data.errorCode;
            if(errorCode == 'user_not_found'){
                res.status(404).send({
                    status: 'failure',
                    errorCode: errorCode,
                    message: 'Usuario no encontrado',
                });
            }else if(errorCode == 'invalid_session_token'){
                res.status(500).send({
                    status: 'failure',
                    errorCode: '',
                    message: 'Internal Server Error',
                });
            }else{
                res.status(500).send({
                    status: 'failure',
                    errorCode: errorMessage,
                    message: 'Internal Server Error',                
                });
            }
        });
        
        // Generates OTP from Entrust
        const createOTPResponse = await createOTP(authenticateResponse.data.authToken,authApplicationId,userId)
        .catch(error => {
            var errorCode = error.response.data.errorCode;
            if(errorCode == 'application_not_found'){
                res.status(404).send({
                    status: 'failure',
                    errorCode: errorCode,
                    message: 'Aplicación de Autenticación no encontrada',
                });
            }else if(errorCode == 'invalid_session_token'){
                res.status(500).send({
                    status: 'failure',
                    errorCode: '',
                    message: 'Internal Server Error',
                });
            }else{
                res.status(500).send({
                    status: 'failure',
                    errorCode: errorMessage,
                    message: 'Internal Server Error',                
                });
            }
        });

        // Setting the name of the application that is being accessed 
        const sistema = (authApplicationId == '40935e0c-6ab8-4fa3-8b63-616a4565bef2') ? 'Poliedro' : 'Visor'; 
        
        //Calling Twilio for sending the SMS with OTP to the given user
        try {
            client.messages
            .create({
                body: 'Su codigo OTP para ingresar a ' + sistema + ' es el siguiente: ' + createOTPResponse.data.otp ,
                from: '+17655776014',
                to: getUserInfoResponse.data.mobile
            })
            .then(() =>
                res.status(201).send({
                    status: 'success',
                    message: 'OTP generado exitosamente',
                    token: createOTPResponse.data.token,
                })
            );    
        } catch (error) {
            res.status(500).json(error.message);
        }
    } catch (error) {
        res.status(500).json(error.message);
    }
}

module.exports = generateOTP;