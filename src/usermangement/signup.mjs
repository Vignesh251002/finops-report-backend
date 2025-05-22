import CustomError from '../utils/CustomError.mjs';
import { generate_out_put_response } from '../utils/commonUtils.mjs';
import { payload_validations } from '../utils/process_validation.mjs';
import DatabaseConnectionPool from '../utils/ConnectionPool.mjs';
import { USER_VERIFICATION } from './schema_config.mjs';

import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const dbPool = new DatabaseConnectionPool();

const COGNITO_USER_POOL = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const REGION = process.env.REGION;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
  let response = {};
  let message = "Error occurred, unable to register the user";
  let status_code = 400;

  try {
    const payload = JSON.parse(event.body || "{}");

    if (Object.keys(payload).length === 0) {
      throw new CustomError("Bad Request: No payload", { status_code: 400 });
    }

    // payload_validations(USER_VERIFICATION, payload);

    const result = await dbPool.transaction(handleUserVerification, payload);

    response = result.response;
    message = result.message;
    status_code = result.status_code;

  } catch (err) {
    console.log("Error occurred in user verification:", err);
    message = err.message;
    status_code = 500;

    if (err instanceof CustomError) {
      status_code = err.statusCode;
      response = err;
    }
  } finally {
    return generate_out_put_response(response, message, status_code);
  }
};

async function handleUserVerification(client, payload) {

  if (user_status === 'verified') {
    throw new CustomError("Clinic already verified.", { statusCode: 400 });
  }

  if (user_status === 'unverified') {
    await confirmUserSignUp(payload);
    await changeStatusOfUserVerified(client, payload.email);

    return {
      message: 'User verified successfully',
      status_code: 200,
      response: {},
    };
  }

  throw new CustomError("Invalid status", { statusCode: 400 });
}

async function confirmUserSignUp(payload) {
  try {
    const input = {
      ClientId: CLIENT_ID,
      Username: payload.email,
      ConfirmationCode: payload.otp,
    };

    const command = new ConfirmSignUpCommand(input);
    await cognitoClient.send(command);

  } catch (err) {
    console.error("Error occurred in confirmUserSignUp:", err);

    let message = "Unknown error during confirmation";
    if (err.__type === "CodeMismatchException") {
      message = "CodeMismatchException";
    } else if (err.__type === "ExpiredCodeException") {
      message = "ExpiredCodeException";
    } else if (err.__type === "TooManyFailedAttemptsException") {
      message = "TooManyFailedAttemptsException";
    } else if (err.__type === "TooManyRequestsException") {
      message = "TooManyRequestsException";
    }

    throw new CustomError(message, {
      name: "confirmUserSignUp",
      statusCode: 400,
    });
  }
}

async function changeStatusOfUserVerified(client, email) {
  try {
    const query = composeUpdateUserEmailVerifiedQuery(email);
    const result = await client.query(query);

    console.log("Update result:", result);

    if (!result.rows || result.rows.length === 0) {
      throw new CustomError('Invalid email or update failed', { statusCode: 400 });
    }

    return result.rows[0].status;

  } catch (error) {
    throw new CustomError(error.message, {
      statusCode: 400,
    });
  }
}

async function getClinicStatus(client, email) {
  const query = `SELECT status FROM ${SCHEMA}.${CLINIC_TABLE_NAME} WHERE email = $1`;
  const values = [email];

  try {
    const result = await client.query(query, values);

    console.log("Clinic status check result:", result);

    if (!result.rows || result.rows.length === 0) {
      throw new CustomError("Invalid Email or OTP", { statusCode: 404 });
    }

    return result.rows[0].status;

  } catch (error) {
    console.error("Error while fetching user status:", error);
    throw new CustomError(error.message, { statusCode: 500 });
  }
}

function composeUpdateUserEmailVerifiedQuery(email) {
  const updatedAt = new Date().toISOString();

  return {
    text: `UPDATE ${SCHEMA}.${CLINIC_TABLE_NAME} 
           SET status = $1, updated_at = $2 
           WHERE email = $3 
           RETURNING status;`,
    values: ['verified', updatedAt, email],
  };
}
