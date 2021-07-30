const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");


const pipe = (...fns) => x => fns.reduce((y, f) => f(y), x);
const resolveFilePath = filepath => path.resolve(process.cwd(), filepath)

const readTextFile = pipe(
  resolveFilePath,
  fs.readFileSync,
  buffer => buffer.toString(),
);

const readJsonFile = pipe(
  readTextFile,
  JSON.parse
)

function readCsvFile(path) {
  return Papa.parse(readTextFile(path), {
    header: true,
    dynamicTyping: true
  });
}

async function sleep(ms) {
  return await new Promise(resolve => setTimeout(resolve, ms));
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

// Import env vars from .env.json

function loadEnvVars(path) {
  const envVars = readJsonFile(path);
  Object.entries(envVars).forEach(([key, value])=>{
    process.env[key] = value;
  });
}

function validateEnvVars(envVars) {
  envVars.forEach(envVar => {
    if(!process.env[envVar]) throw `Missing required env var "${envVar}"`;
  })
}


function parseBoolean(str) {
  if(str === undefined) throw `Must be called with String or Boolean but got \`${str}\``
  if (typeof str === "boolean") return str;
  const normalized = normalizeToken(str);
  if (normalized == 'true') return true;
  if (normalized == 'false') return false;
  throw `parseBoolean failed. Unable to convert string "${str}" to Boolean.`;
}

const normalizeToken = str => str.trim().toLowerCase();

exports.readJsonFile = readJsonFile;
exports.loadEnvVars = loadEnvVars;
exports.validateEnvVars = validateEnvVars;
exports.readCsvFile = readCsvFile;
exports.readTextFile = readTextFile;
exports.parseBoolean = parseBoolean;
exports.sleep = sleep;
exports.asyncForEach = asyncForEach;