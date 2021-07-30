//const lockfile = require("proper-lockfile");

const AWS = require('aws-sdk');
const ProgressBar = require('progress');
const queue  = require('async/queue');
const populateTemplate = require('string-template');
const chunk = require('lodash.chunk');

const BATCH_SIZE = 19; // Limit is 20 messages/second
const BATCH_WAIT_MS = 1001;

const { readTextFile, readJsonFile, readCsvFile, loadEnvVars, validateEnvVars, parseBoolean, sleep, asyncForEach } = require("./util.js");

const DATA_DIRECTORY = "../" + process.env.DATA_DIRECTORY;
const PROGRESS_FILE = DATA_DIRECTORY + "progress.txt";

const THREAD_COUNT = 16;

const snsParams = {
  attributes: {
    DefaultSMSType: 'Transactional', 
    UsageReportS3Bucket: process.env.SNS_USAGE_REPORT_S3_BUCKET
  }
}

const SNS = new AWS.SNS();
SNS.setSMSAttributes(snsParams);

async function sendMessage({messageTemplate, recipient}) {
  const finalMessage = populateTemplate(messageTemplate, recipient);

  const params = {
    Message: finalMessage,
    PhoneNumber: recipient.phone
  }

  SNS.publish(params).promise();
}


async function sendMessages(messageTemplate, recipients) {
  
  console.log(`🚀 Sending ${recipients.length} messages...`);
  console.log(`🧵 ${THREAD_COUNT} threads`)
  
  let sentMessageCount = 0;
  const totalMessageCount = recipients.length;

  const startTime = new Date();

  const messages = recipients.map(recipient => { return {
      messageTemplate, recipient
    }
  })

  var bar = new ProgressBar(':current/:total :bar (:percent) :eta', { total: totalMessageCount });
  
  const q = queue(sendMessage, THREAD_COUNT);

  q.error(function(err, task) {
    console.error(`❗️ Task ${task} threw an error:`);
    console.error(err);
  });


  const messageBatches = chunk(messages, BATCH_SIZE);

  await asyncForEach(messageBatches, async batch => {
    q.push(batch,  function(err) {
      sentMessageCount += 1;
      bar.tick();
    });
    await sleep(BATCH_WAIT_MS);
  })
  
  await q.drain();

  const endTime = new Date();

  console.log(`✅ All messages sent (${(endTime - startTime) / 1000}s)`);
}


exports.sendMessages = sendMessages;
