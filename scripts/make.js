// `npm run make`: runs electron-forge make, and starts it again (up to 3 tries) when Apple's
// timestamp server drops one of the thousands of signing requests ("A timestamp was expected but
// was not found"). Any other error stops the build straight away.
const { spawn } = require('child_process');
const TIMESTAMP_ERROR = 'A timestamp was expected but was not found';
const MAX_TRIES = 3;

function run() {
  return new Promise((resolve) => {
    let output = '';
    const child = spawn('npx', ['electron-forge', 'make'], { stdio: ['inherit', 'pipe', 'pipe'] });
    child.stdout.on('data', d => { process.stdout.write(d); output += d; });
    child.stderr.on('data', d => { process.stderr.write(d); output += d; });
    child.on('close', code => resolve({ code, output }));
  });
}

(async () => {
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const { code, output } = await run();
    if (code === 0) process.exit(0);
    if (!output.includes(TIMESTAMP_ERROR) || attempt === MAX_TRIES) process.exit(code || 1);
    console.log(`\nApple's timestamp server dropped a request (try ${attempt} of ${MAX_TRIES}). Starting the build again in 30 seconds...\n`);
    await new Promise(r => setTimeout(r, 30000));
  }
})();
