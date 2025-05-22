import REGEX_PATTERN from "../utils/regex_pattern.mjs";


export const LOGIN = {
  properties: {
    email: {
      type: "string",
      pattern: REGEX_PATTERN.EMAIL_REGEX,
      minLength: 5,
      maxLength: 100,
    },
    password: {
      type: "string",
      pattern: REGEX_PATTERN.PASSWORD_REGEX,
      // "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%^&+=!])(?=.*[^[0-9a-zA-z]).{8,}$",
      minLength: 8,
      maxLength: 20,
      errorMsg: {
        pattern: "Your password must be at least 8 characters long and include both letters and numbers."
      }
    },
  },
  required: ["email", "password"],
};

export const USER_REGISTRATION = {
  properties: {
    first_name: {
      type: "string",
      minLength: 2,
      maxLength: 50,
      pattern: "^[A-Za-z]+$",
      requiered: true,
      errorMsg: {
        type: "First name must be a string.",
        minLength: "First name must be at least 2 characters long.",
        maxLength: "First name cannot exceed 50 characters.",
        pattern: "First name can only contain alphabetic characters.",
        required: "First name is required.",
      },
    },
    last_name: {
      type: "string",
      minLength: 2,
      maxLength: 50,
      pattern: "^[A-Za-z]+$",
      requiered: true,
      errorMsg: {
        type: "Last name must be a string.",
        minLength: "Last name must be at least 2 characters long.",
        maxLength: "Last name cannot exceed 50 characters.",
        pattern: "Last name can only contain alphabetic characters.",
        required: "Last name is required.",
      },
    },
    email: {
      type: "string",
      pattern: REGEX_PATTERN.EMAIL_REGEX,
      minLength: 5,
      maxLength: 100,
      requiered: true,
      errorMsg: {
        type: "Email must be a valid string.",
        minLength: "Email must be at least 5 characters long.",
        maxLength: "Email cannot exceed 100 characters.",
        pattern: "Please provide a valid email address.",
        required: "Email is required.",
      },
    },
    password: {
      type: "string",
      pattern: REGEX_PATTERN.PASSWORD_REGEX,
      minLength: 8,
      maxLength: 20,
      requiered: true,
      errorMsg: {
        type: "Password must be a valid string.",
        minLength: "Password must be at least 8 characters.",
        maxLength: "Password cannot exceed 20 characters.",
        pattern: "Password must include uppercase, lowercase, numbers, and special characters.",
        required: "Password is required.",
      },
    },
  },
 
};



export const USER_VERIFICATION = {
  properties: {
    email: {
      type: "string",
      pattern: REGEX_PATTERN.EMAIL_REGEX,
      // "pattern": "^(\\+91[-\\s]?)?0?([6789]\\d{9})$",
      minLength: 5,
      maxLength: 100,
    },
    otp: {
      type: "string",
      pattern: REGEX_PATTERN.SMS_CODE_REGEX,
      minLength: 6,
      maxLength: 6,
    },
  },
  required: ["email", "otp"],
};

export const FORGET_PASSWORD_REQUEST = {
  properties: {
    email: {
      type: "string",
      pattern: REGEX_PATTERN.EMAIL_REGEX,
      // "pattern": "^(\\+91[-\\s]?)?0?([6789]\\d{9})$",
      minLength: 5,
      maxLength: 100,
    },
  },
  required: ["email"],
};