import { generateOutputResponse, ErrorHandling, getManagementClient, dbConnection } from "../utils/commonUtils.mjs";
import { AuthApiError } from "auth0"
import { DataTypes } from 'sequelize'
import { getModel } from "../lib/models/Models.mjs";
import { schemaValidation } from "../utils/schemavalidation.mjs";
import { v4 as uuidv4 } from "uuid";
import {  PinpointEmailClient,  SendEmailCommand } from "@aws-sdk/client-pinpoint-email";

const FORGET_PASSWORD_TEMPLATE = process.env.FORGET_PASSWORD_TEMPLATE;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const ManagementClient = getManagementClient();

export const handler =  async (event) => {
  let resp = {};
  let message = "error occured unable forget password user.";
  let statusCode = 400;
  let isError = false;
  try {
    let payload = JSON.parse(event.body || '{}');
    if (Object.keys(payload).length === 0) {
      throw new ErrorHandling("Bad Request: No payload");
    }
    schemaValidation("forgetPassword", payload);
    await sendChangePasswordLink(payload.email);
    message = `Reset password link sent to ${payload.email} successfully.`;
    statusCode = 200;
  }
  catch (err) {
    console.error('Error occured in forget password handler : ', err);
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

async function sendChangePasswordLink(email) {

  let auth_id = await getUserIdByEmail(email);
   
  let user_data = await ManagementClient.users.get({ id: auth_id });
  user_data = user_data.data;
  
  if(!user_data.email_verified) {
     throw new ErrorHandling("Please Confirm Your Email.", {
        statusCode: 403
    });
  }
  
  let user_metadata = user_data.user_metadata;
  
  if(!payload.resend) {
    if(user_metadata.forget_password_token && new Date(user_metadata.forget_password_expirydate) > Date.now()) {
      throw new ErrorHandling("Forget Password link already sent to your Email Id, or try resend.", {
          statusCode: 403
      });
    }  
  }

  let forget_password = {
    token: uuidv4(),
    expiry_date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
  }
  
  let temp_domain = "https://finops.dev.meyicloud.com"

  let template_data =  {
    "changePasswordLink":	`${temp_domain}/user/passwordchange/confirm?token=${forget_password.token}&id=${auth_id.split("|")[1]}`, 
    "expiryDate": forget_password.expiry_date
  }
  
  await ManagementClient.users.update({ id: auth_id }, {
    user_metadata: {
      forget_password_token: forget_password.token,
      forget_password_expirydate: forget_password.expiry_date
    }
  });
 
  await sendEmail(email, template_data);
}

async function getUserIdByEmail(email) {
  let sequelize = await dbConnection();
  try {
    const User = getModel("UserModel", sequelize, DataTypes);
    if (!User) {
      throw new ErrorHandling("User model not found.", {
        statusCode: 500
      })
    }
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      throw new ErrorHandling("User not found.", {
        statusCode: 404
      })
    }
    return user.authId;
  } 
  finally {
    await sequelize.close()
  }
}

async function sendEmail(email_id, template_data) {
 try {
    let client = new PinpointEmailClient();
    let input = {
      FromEmailAddress: SENDER_EMAIL, //"shanya26@gmail.com",
      Destination: {
        ToAddresses: [email_id],
      },
      Content: {
        Template: {
          TemplateArn: FORGET_PASSWORD_TEMPLATE,
          TemplateData: JSON.stringify(template_data),
        },
      },
    };
    console.log("email input", input);
    let command = new SendEmailCommand(input);
    let response = await client.send(command);
    console.debug("response : ", response);
  } catch (err) {
    console.error("error occurred unable to send Templated Eamil : ", err);
    throw new ErrorHandling(err.message, {
      statusCode: 500 
    });
  }
}