const chalk = require('chalk');
const yesno = require('yesno'); 

const formatPhone = require('phone');
const populateTemplate = require('string-template');


const { readTextFile, readJsonFile, readCsvFile, loadEnvVars, validateEnvVars, parseBoolean } = require("./util.js");

const REQUIRED_ENV_VARS = [
  "DATA_DIRECTORY",
  "PRICE_PER_MESSAGE_USD"
]

const ASCII_REGEX = /^[\x00-\x7F]*$/g
const SMS_ASCII_LIMIT = 140;
const SNS_MESSAGE_SEND_AVERAGE_MS = 250;

loadEnvVars("../.env.json");
validateEnvVars(REQUIRED_ENV_VARS);

const DATA_DIRECTORY = "../" + process.env.DATA_DIRECTORY;
const MESSAGE_RECIPIENT_FILE_PATH = DATA_DIRECTORY + "phones.csv";
const MESSAGE_TEMPLATE_PATH = DATA_DIRECTORY + "template.txt";

// Runtime
async function main() {
  try {
    console.log("\n🏎 Start!");
  
    const textTemplate = readTextFile(MESSAGE_TEMPLATE_PATH);
    let recipients = readMessageRecipientFile();
  
    recipients  = validatePhoneNumbers(recipients)
    checkMessageLength(textTemplate)
    console.log(`✅ All validations passed`);

    computeEstimatedPricePrompt(recipients);

    const ok = await yesno({ question: 'Ready to send? [y/n]' });

    if(!ok) {
      console.log("💥 Cancelled.");
      return;
    }

    console.log("🌙 That's all, folks!");
   
  } catch(error) {
    console.error(error);
    console.log("💣 Exited with error.");
  }
}

function readMessageRecipientFile() {
  console.log(`🌀 Reading recipient CSV file (${MESSAGE_RECIPIENT_FILE_PATH})`);
  const {data: recipients} = readCsvFile(MESSAGE_RECIPIENT_FILE_PATH);
  console.log(`📂 Found ${recipients.length} recipient${recipients.length == 1 ? '' : 's'}`);
  return recipients;
}

function validatePhoneNumbers(recipients) {
  console.log(`ℹ️ Phone numbers without a international country code will be assumed to be North American (+1)\n`);
  console.log(`🔬 Validating ${recipients.length} recipients...`);
  const results = recipients.map((r, i) => {
    if(!r.phone) {
      console.error(`❗️ Validation failed!\nRow ${i} has missing phone number!`);
      console.error(r);
      throw new TypeError();
    }
    const normalizedPhone = formatPhone(r.phone, '', false);
    if(normalizedPhone.length == 0) {
      console.error(`❗️ Validation failed!\nRow ${i} has invalid phone number "${r.phone}"`);
      throw new TypeError();
    }
    return {
      ...r,
      phone: normalizedPhone[0]
    }
  })
  console.log(`✅ All phone numbers normalized`);
  console.log(`✅ Recipient validation passed`);
  
  return results;
}

function checkMessageLength(message) {
  console.log(`🔬 Checking message...`);
  console.log(`ℹ️ "${message}"`);
  if(!isASCII(message)) console.error(`❗️ Message contains non-ASCII charater ${message.replace(ASCII_REGEX, '')}`);
  console.log(`✅ Message is ASCII only`);

  const byteSize =  Buffer.byteLength(message, 'utf8')
  if(byteSize > SMS_ASCII_LIMIT) console.error(`❗️ Message is too long and will be split (Length: ${byteSize}, Limit: ${SMS_ASCII_LIMIT})`);
  console.log(`✅ Message byte length is ${byteSize} (Limit is ${SMS_ASCII_LIMIT})`);
}


function isASCII(str) {
  return ASCII_REGEX.test(str);
}


async function computeEstimatedPricePrompt(recipients) {
  const pricePerMessageUSD = parseFloat(process.env.PRICE_PER_MESSAGE_USD);
  const totalPriceUSD = recipients.length * pricePerMessageUSD;

  const estimatedSendTimeMS = recipients.length * SNS_MESSAGE_SEND_AVERAGE_MS;
  const estimatedSendTimeSeconds = estimatedSendTimeMS / 1000;
  console.log(`\n⏰ Estimated send time: ${estimatedSendTimeSeconds}s`);
  console.log(`💸 Estimated AWS price to send: $${totalPriceUSD}`);

  
}


main();