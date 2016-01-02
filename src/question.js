import Promise from 'bluebird';
import readline from 'readline';

const stdin = process.stdin,
  stdout = process.stdout,
  iface = readline.createInterface({
    input: stdin,
    output: stdout
  });

export default function question(query = '', hidden = false) {
  if (hidden) {
    stdin.resume();
    let i = 0;
    stdin.on('data', char => {
      switch (String(char)) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.pause();
          break;
        default:
          stdout.write(`\u001b[2K\u001b[200D${query}[${(i % 2 == 1) ? '=-' : '-='}]`);
          i++;
          break;
      }
    });
  }
  return new Promise(resolve => {
    iface.question(query, value => {
      if (hidden)
        iface.history.shift();
      resolve(value);
    });
  });
}
