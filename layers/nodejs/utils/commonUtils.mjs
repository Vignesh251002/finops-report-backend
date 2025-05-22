import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Sequelize } from "sequelize";
import { AuthenticationClient } from "auth0";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.CLIENT_SECRET;

const DATABASE_SECRET_ID = process.env.DATABASE_SECRET_ID;
const REGION = process.env.REGION;
/**
 * 
 * @param {Object} response 
 * @param {string} message 
 * @param {integer} statusCode 
 * @param {boolean} isError 
 * @returns Object
 */
export const generateOutputResponse = (response, message = "success", statusCode = 200, isError = false) => {
  const result = {
    message: message,
    error: isError,
    statusCode: statusCode,
    response: response
  }
  if (!isError) {
    if (Array.isArray(response)) {
      result.total = response.length
      result.response = response
    } else {
      if (response.hasOwnProperty("items")) {
        result.response = response.items
      }
      if (response.hasOwnProperty("total")) {
        result.total = response.total
      }
    }
  }
  return {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*"
    },
    body: JSON.stringify(result),
  }
}

/**
 * Custom error handling
 */
export class ErrorHandling extends Error {
  constructor(message, errorObject = {}) {
    super(message)
    this.name = errorObject.name ?? this.constructor.name;
    this.statusCode = errorObject.statusCode ?? 400;
  }
}

export async function dbConnection() {
  try {
    const dbCredentials = JSON.parse(await getSecret(DATABASE_SECRET_ID));
    const { username, password, dbname, host, engine } = dbCredentials
    const sequelize = new Sequelize({
      "username": username,
      "password": password,
      "database": dbname,
      "host": host,
      "dialect": engine,
      "dialectOptions": {
        "multipleStatements": true,
        "connectTimeout": 60000,
        "ssl": {
          "require": false,
          "rejectUnauthorized": false
        }
      }
    });
    await sequelize.authenticate();
    console.debug("making new database connection authenticated");
    await sequelize.sync();
    console.debug("models synced to database");
    return sequelize;
  }
  catch (err) {
    console.error("error on create connection : ", err);
    throw new ErrorHandling("error occurred unable to connect to database.", {
      name: "connectToDatabase",
      statusCode: 500
    });
  }
}

export async function getSecret(secret_id) {
  const secretClient = new SecretsManagerClient({
    REGION: REGION,
  });

  let response;

  try {
    response = await secretClient.send(
      new GetSecretValueCommand({ SecretId: secret_id })
    );
  }
  catch (error) {
    console.error('error get SecretId', error);
    throw new ErrorHandling("error occurred unable to get credentials from secret manager.", {
      name: "getSecret",
      statusCode: 500
    });
  }
  return response.SecretString;
}


export const getAuthenticationClient = () => {
    const authClient = new AuthenticationClient({
      domain: AUTH0_DOMAIN,          
      clientId: AUTH0_CLIENT_ID,     
      clientSecret: AUTH0_CLIENT_SECRET 
    });
return authClient;
}