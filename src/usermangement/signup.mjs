import { generateOutputResponse, ErrorHandling, getAuthenticationClient, dbConnection } from "../utils/commonUtils.mjs";
import { AuthApiError } from "auth0"
import { DataTypes } from 'sequelize'
import { getModel } from "../lib/models/Models.mjs";
import { schemaValidation } from "../utils/schemavalidation.mjs";
import { v4 as uuidv4 } from "uuid";

const AuthenticationClient = getAuthenticationClient();
const CONNECTION = process.env.CONNECTION;
/**
 * 
 * @param {JSON} event 
 * @returns 
 */
export const handler = async (event) => {
    let statusCode = 200;
    let message = "User Created Successfully."
    let error = false;
    let resp = {};
    try {
        let payload = JSON.parse(event.body || '{}');
        if (Object.keys(payload).length === 0) {
            throw new ErrorHandling("Bad Request: No payload");
        }
        schemaValidation("signup", payload);
        await signUp(payload);
    }
    catch (err) {
        console.debug('Error occured in signup handler : ', err);
        message = err.message;
        error = true;
        statusCode = 500;
        if (err instanceof ErrorHandling || err instanceof AuthApiError) {
            statusCode = err.statusCode;
        }
    } finally {
        return generateOutputResponse(resp, message, statusCode, error);
    }
}

/**
 * 
 * @param {JSON} payload 
 * @returns 
 */

const signUp = async (payload) => {
    let user_id = uuidv4();
    const userDetails = {
        connection: CONNECTION ?? 'Username-Password-Authentication',
        email: payload.email,
        password: payload.password,
        email_verified: false,
        given_name: payload.firstName,
        family_name: payload.lastName,
        user_metadata: {
            role: payload.userRole
        },
        name: payload.firstName + " " + payload.lastName,
        user_id: user_id
    };
    let resp = await AuthenticationClient.database.signUp(userDetails);
    console.debug("Auth0 Resp::", resp.data);
    await createUserInDatabase(resp.data);
    return resp;
}


async function createUserInDatabase(userData) {
    let sequelize = await dbConnection();
    const User = getModel("UserModel", sequelize, DataTypes);
    if (!User) {
       throw new ErrorHandling("User model not found.", {
           statusCode: 500
       })
    }  
    let user_id = uuidv4();
    await User.create({
        id: user_id,
        firstName: userData.given_name,
        lastName: userData.family_name,
        email: userData.email,
        authId: "auth0|" + userData._id,
        status: "ACTIVE",
        createdBy: user_id,
    })
    console.debug("User created in the database Successfully.");
}