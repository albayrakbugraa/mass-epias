const fs = require('fs');
const { exec } = require('child_process');

// Define the commands to be executed in parallel
const commandLines = [
  //['node MassSync.js AEDAS', 'node MassAutomate.js -a xx AEDAS'],
  //['node MassSync.js BEDAS', 'node MassAutomate.js -a xx BEDAS'],
  ['node MassSync.js CEDAS', 'node MassAutomate.js -a xx CEDAS']
];

// Log file path
const logFilePath = './LogsAlaAutoFullLog.txt';

// Function to write to the log file
function writeToLogFile(data) {
  fs.appendFile(logFilePath, data + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}

// Function to run a single command line sequentially
function runCommandLineSequentially(commands) {
  return commands.reduce((prevPromise, cmd) => {
    return prevPromise.then(() => {
      console.log(`${cmd} started..`);
      let command = cmd + exParam;
      return new Promise((resolve, reject) => {
        const child = exec(command);
        child.on('error', error => {
          console.error(`error cmd: ${command}`);
          console.error(error);
          reject(error);
        });

        child.stdout.on('data', data => {
          const logData = `Out Cmd ${command}: ${data}`;
          console.log(logData);
          writeToLogFile(logData);
        });

        child.stderr.on('data', data => {
          const logData = `Error output for command ${command}: ${data}`;
          console.error(logData);
          writeToLogFile(logData);
        });

        child.on('close', code => {
          if (code === 0) {
            const logData = `Command executed successfully: ${command}`;
            console.log(logData);
            writeToLogFile(logData);
            resolve();
          } else {
            const logData = `Command failed with exit code ${code}: ${command}`;
            console.error(logData);
            writeToLogFile(logData);
            reject();
          }
        });
      });
    });
  }, Promise.resolve());
}

// Function to run all command lines in parallel
async function runCommandLinesParallel(commandLines) {
  const promises = commandLines.map(commands => runCommandLineSequentially(commands));
  await Promise.all(promises);
  console.log('All command lines executed successfully.');
  writeToLogFile('All command lines executed successfully.');
}
/*
params
no param : all containers
0:redis
1:backend
2:entserver
3:frontend
4:monitor

node AlaFull.js 2       

*/
//belirli bir container'ı deploy etmek için
var myArgs = process.argv.slice(2); 
let IntCont =  myArgs[0];
let exParam =' '
if (IntCont)
  exParam =' '+IntCont
else
  exParam =' ';


// Start running the command lines in parallel

runCommandLinesParallel(commandLines);
