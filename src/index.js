const fs = require('fs');

const chalk = require('chalk');
const yesno = require('yesno'); 

const formatPhone = require('phone');




const { readTextFile, readJsonFile, readCsvFile, loadEnvVars, validateEnvVars, parseBoolean } = require("./util.js");
const { log } = require('console');

const REQUIRED_ENV_VARS = [
  "DATA_DIRECTORY",
  "PRICE_PER_MESSAGE_USD",
  "SNS_USAGE_REPORT_S3_BUCKET"
]

const ASCII_REGEX = /^[\x00-\x7F]*$/g
const SMS_ASCII_LIMIT = 140;
const SNS_MESSAGE_SEND_AVERAGE_MS = 265;

loadEnvVars("../.env.json");
validateEnvVars(REQUIRED_ENV_VARS);

const { sendMessages } = require("./sendMessages.js");

const DATA_DIRECTORY = "../" + process.env.DATA_DIRECTORY;
const MESSAGE_RECIPIENT_FILE_PATH = DATA_DIRECTORY + "recipients.csv";
const MESSAGE_TEMPLATE_PATH = DATA_DIRECTORY + "template.txt";
const PROGRESS_FILE = DATA_DIRECTORY + "progress.txt";

// Runtime
async function main() {
  try {
    console.log("\n🏎 Start!");
  
    const textTemplate = readTextFile(MESSAGE_TEMPLATE_PATH);
    let recipients = readMessageRecipientFile();
  
    checkMessageLength(textTemplate);

    recipients  = validatePhoneNumbers(recipients)
    
    console.log(`✅ All validations passed`);
    console.log(`🌍 Total recipients: ${recipients.length}`);

    //await checkForProgressFile(recipients);

    computeEstimatedPricePrompt(recipients);

    const ok = await yesno({ question: `\n🚀 Ready to send to ${recipients.length} recipients? [y/n]` });

    if(!ok) {
      console.log("💥 Cancelled.");
      return;
    }

    await sendMessages(textTemplate, recipients);

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
  let results = []

  let duplicates = {};

  recipients.forEach((r, i) => {
    if(!r.phone) {
      console.error(`❗️ Validation failed!\nRow ${i} has missing phone number!`);
      console.error(r);
      throw new TypeError();
    }
    let normalizedPhone = formatPhone(r.phone, '', false);
    if(normalizedPhone.length == 0) {
      console.error(`❗️ Validation failed!\nRow ${i} has invalid phone number "${r.phone}"`);
      throw new TypeError();
    }

    normalizedPhone = normalizedPhone[0];

    if(results.find(result => result.phone == normalizedPhone)) { 
      if(!duplicates[normalizedPhone]) duplicates[normalizedPhone] = { count: 0 }
      duplicates[normalizedPhone].count += 1;
      // duplicates[normalizedPhone].duplicateRecipients.push(r)
      return;
    }

    results.push({
      ...r,
      phone: normalizedPhone
    })
  })

  console.log(`✅ All phone numbers normalized`);
  
  const duplicateCount = Object.keys(duplicates).length

  if(duplicateCount > 0) {
    console.log(`❗️ ${duplicateCount} duplicate phone numbers found.`);
    console.log(duplicates);

    const totalNumbersRemoved = Object.values(duplicates).reduce((all, d) => all += d.count, 0);
    console.log(`💂 ${totalNumbersRemoved} total duplicates were removed`);
    console.log(`🌍 ${results.length} recipients remaining`);
  } else {
    console.log(`✅ No duplicates found`);
  }

  console.log(`✅ Recipient validation complete\n`);
  
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

async function checkForProgressFile(recipients) {
  console.log(`\n🌀 Checking for progress file...`);
  if(fs.existsSync(PROGRESS_FILE)) {
    const progress = readCsvFile(PROGRESS_FILE);
    const unsentCount = recipients.length - progress.length;
    console.log(`\n🎉 Progress file found`);
    if(unsentCount == 0) {
      throw `✅ All ${recipients.length} messages have already been sent.`;
    }
    console.log(`${progress.length} messages already sent.\n(Full list here: ${PROGRESS_FILE})`);
    const ok = await yesno({ question: `Would you like to proceed? [y/n]` });
    if(!ok) throw "Aborted";
  } else {
    console.log(`✅ No progress file found`);
  }
}


main();