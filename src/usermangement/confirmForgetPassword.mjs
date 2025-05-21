import { generateOutputResponse, ErrorHandling, getManagementClient} from "../utils/commonUtils.mjs";
import { AuthApiError } from "auth0"
import { schemaValidation } from "../utils/schemavalidation.mjs";

const CONNECTION = process.env.CONNECTION;
const ManagementClient = getManagementClient();


export const handler =  async (event) => {
  let resp = {};
  let message = "error occured unable confirm forget password user.";
  let statusCode = 400;
  let isError = false;
  try {
    let payload = JSON.parse(event.body || '{}');
    if (Object.keys(payload).length === 0) {
      throw new ErrorHandling("Bad Request: No payload");
    }
    schemaValidation("confirmForgetPassword", payload);
    await confirmForgetPassword(payload);
    message = "New Password Changed Successfully.";
    statusCode = 200;
  }
  catch (err) {
    console.error('Error occured in confirm forget password handler : ', err);
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
}

async function confirmForgetPassword(payload) {
  let user_data = await ManagementClient.users.get({ id: payload.id });
  user_data = user_data.data;  
  isValidUser(user_data, payload.token);
  let resp = await ManagementClient.users.update({ id: payload.id }, {
      password: payload.password,
      connection: CONNECTION,
      user_metadata: {
        forget_password_token: null,
        forget_password_expirydate: null
      }
  });
  console.debug("Update res", resp);
}

function isValidUser(user_data, token) {
  if(!user_data.email_verified) {
    throw new ErrorHandling("Please Confirm Your Email.", {
       statusCode: 403
    });
  }

  let user_metadata = user_data.user_metadata;

  if(!user_metadata.forget_password_token) {
    throw new ErrorHandling("Invalid Request, Forget Password is not requested.", {
        statusCode: 403
    });
  }

  if(user_metadata.forget_password_token !== token && new Date(user_metadata.forget_password_expirydate) > Date.now()) {
    throw new ErrorHandling("Invalid Forget Password Token.", {
        statusCode: 403
    });
  } 
  
  if(user_metadata.expiryDate < Date.now()) {
    throw new ErrorHandling("Forget Password Token Expired. please try again.", {
        statusCode: 403
    });
  }
}