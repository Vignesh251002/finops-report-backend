import { generateOutputResponse, ErrorHandling, getAuthenticationClient } from "../utils/commonUtils.mjs";
import { schemaValidation } from "../utils/schemavalidation.mjs";
import { AuthApiError } from "auth0"
import jwt from 'jsonwebtoken';

const AUTH0_CLIENT_ID = process.env.CLIENT_ID;
const CONNECTION = process.env.CONNECTION;
const Auth0Client = getAuthenticationClient();

export const handler = async (event) => {
  let resp = {};
  let message = "error occured unable login user.";
  let statusCode = 400;
  let isError = false;
  try {
    let payload = JSON.parse(event.body || '{}');
    if (Object.keys(payload).length === 0) {
      throw new ErrorHandling("Bad Request: No payload");
    }
    schemaValidation("login", payload);
    resp = await login(payload);
    message = "Logged in successfully.";
    statusCode = 201;
    console.log(resp);
  }
  catch (err) {
    console.error('Error occured in login handler : ', err);
    message = err.message;
    isError = true;
    statusCode = 500;
    if (err instanceof AuthApiError || err instanceof ErrorHandling) {
      statusCode = err.statusCode;
    }
  }
  finally {
    return generateOutputResponse(resp, message, statusCode, isError);
  }
};

const login = async (payload) => {
  let resp = await Auth0Client.oauth.passwordGrant({
    grant_type: 'PASSWORD',
    client_id: AUTH0_CLIENT_ID,
    username: payload.username,
    password: payload.password,
    realm: CONNECTION,
  });
  console.debug("login resp::", resp);
  let { access_token, scope, expires_in, ...user_token } = resp.data;
  decodeToken(user_token, payload.username);
  return user_token;
}


function decodeToken(user_token, username) {
  const decoded = jwt.decode(user_token.id_token, { complete: true });
  let email_verified = decoded.payload.email_verified;
  user_token.username = username;
  user_token.firstName = decoded.payload.given_name;
  user_token.lastName = decoded.payload.family_name;
  if (!email_verified) {
    throw new ErrorHandling("Please verify email before login.", {
      statusCode: 403
    });
  }
}