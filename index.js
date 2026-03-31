const { spawn } = require('node:child_process');
const path = require('node:path');

let botProcess = null;

const manageBotProcess = (script) => {
  if (botProcess) {
    botProcess.kill();
    console.log(`🔁 Terminated previous instance of ${script}.`);
  }

  botProcess = spawn('node', ['--trace-warnings', '--async-stack-traces', script], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  botProcess.on('close', (exitCode) => {
    console.log(`💤 ${script} terminated with code: ${exitCode}`);
  });

  botProcess.on('error', (error) => {
    console.error(`❌ Error while starting ${script}: ${error.message}`);
  });
};

manageBotProcess('core/app.js');