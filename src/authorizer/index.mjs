import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import axios from "axios";

import { ErrorHandling, getManagementClient, dbConnection } from "../utils/commonUtils.mjs";
import { AuthApiError } from "auth0";
import { DataTypes } from 'sequelize'
import { getModel } from "../lib/models/Models.mjs";

const AUTH0_DOMAIN = process.env.DOMAIN;

export const lambda_handler = async (event, context, callback) => {
  let decodedToken = await verifyAuthorizationToken(event); 
  const policy = generatePolicy("User", "Allow", event.methodArn, decodedToken);
  return policy
};

async function verifyAuthorizationToken(event) {
  let token = event.authorizationToken;
  if (!token) {
    console.debug("Authorization Token Missing!");
    throw new Error("Unauthorized");
  }
  const tokenCrop = token.replace('Bearer ', '');
  return await verify(tokenCrop);
}

const generatePolicy = function (principalId, effect, resource, decodedToken) {
  return {
    "principalId": principalId,
    "policyDocument": {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": "execute-api:Invoke",
          "Effect": effect,
          "Resource": [resource],
        }
      ]
    },
    "context": { user: JSON.stringify(decodedToken) },
  }
};

async function getJwkByKid(url, kid) {
  let issResponse = await axios(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  for (let index = 0; index < issResponse.data.keys.length; index++) {
    const key = issResponse.data.keys[index];
    if (key.kid === kid) {
      return key;
    }
  }
  console.debug("Failed to find JWK by token KID");
}

async function verify(token) {
  try {
    const decodedToken = jwt.decode(token, { complete: true });

    let trustedIssuers = [`https://${AUTH0_DOMAIN}/`];

    if (!trustedIssuers.includes(decodedToken.payload.iss)) {
      throw new Error('Unauthorized');
    }
    const url = `https://${AUTH0_DOMAIN}/.well-known/jwks.json`;

    jwt.verify(token, jwkToPem(await getJwkByKid(url, decodedToken.header.kid)));

    let auth_id = decodedToken.payload.sub;
    await isAuthorizedUser(auth_id);
    return decodedToken;
  } catch (err) {
    console.debug("Error in token decode ::", err);
    throw new Error("Unauthorized");
  }
}

async function isAuthorizedUser(auth_id) {
  let sequelize = await dbConnection();
  const User = getModel("UserModel", sequelize, DataTypes);
  let ManagementClient = getManagementClient();
  let user_data = await ManagementClient.users.get({
    fields: ["user_metadata"],
    id: auth_id,
    include_fields: true
  });
}