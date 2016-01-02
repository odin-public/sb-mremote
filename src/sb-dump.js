import Promise from 'bluebird';
import question from './question.js';
import url from 'url';
import querystring from 'querystring';
import http from 'http';
import https from 'https';

Promise.promisifyAll(https);

const PORT = 8080,
  HOST = 'localhost',
  l = console.log,
  host = 'https://dev.apsstandard.org',
  loginUrl = host + '/develop/admin/',
  logoutUrl = host + '/develop/admin/logout/',
  sbDumpUrl = host + '/develop/admin/catalog/apscataloguser/sandboxes-dump';

let stop,
  session;

Promise.join(new Promise((resolve, reject) => {
      https.request(loginUrl, resolve).on('error', reject).end();
}), question('Username: ').then(user => Promise.join(user, question('Password: ', true)))).spread((response, creds) => {
  let tokenCookie = response.headers['set-cookie'].find(v => v.startsWith('csrftoken'));
  const [username, password] = creds,
    options = url.parse(loginUrl);
  if (!tokenCookie) 
    throw new Error('No \'csrftoken\' cookie found in response');
  tokenCookie = tokenCookie.split(';')[0]
  options.headers = {
    cookie: tokenCookie,
    referer: loginUrl,
    'content-type': 'application/x-www-form-urlencoded'
  };
  options.method = 'post';
  return new Promise((resolve, reject) => {
    tokenCookie = tokenCookie.split('=')[1];
    const post = querystring.stringify({
      csrfmiddlewaretoken: tokenCookie,
      username,
      password,
      this_is_the_login_form: 1
    });
    options.headers['content-length'] = post.length;
    https.request(options, resolve).on('error', reject).end(post);
  });  
}).then(response => {
  session = response.headers['set-cookie'].find(v => v.startsWith('apssession'));
  if (session)
    l('Login successful!');
  else
    throw new Error('No \'apssession\' cookie found in response');
  session = session.split(';')[0];
  const options = url.parse(sbDumpUrl);
  options.headers = {
    cookie: session,
    referer: loginUrl
  };
  const server = http.createServer((request, response) => {
    l('Incoming request...');
    if (request.url.indexOf('stop') !== -1) {
      l('Request URL containts \'stop\'!');
      stop();
      return;
    }
    https.request(options, sbDump => {
      response.on('error', e => {
        l(`Response error: ${e.message}`);
      });
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      sbDump.on('data', data => response.write(data, 'utf-8'));
      sbDump.on('end', () => {
        l('Request handled!');
        response.end();
      });
    }).on('error', e => {
      response.statusCode = 500;
      response.end();
    }).end();
  });
  return new Promise((resolve, reject) => {
    server.on('error', err => {
      server.removeAllListeners('error').removeAllListeners('listening');
      reject(err);
    }).on('listening', () => {
      server.removeAllListeners('error').removeAllListeners('listening');
      resolve(server);
    }).listen(PORT, HOST);
  }).reflect();
}).then(listening => {
  if (listening.isFulfilled())
    l(`Listening on ${HOST}:${PORT}`);
  else {
    l(`Failed to bind to ${HOST}:${PORT}: ${listening.reason()}!`);
    return;
  }
  return new Promise(resolve => stop = resolve);
}).then(() => {
  l('Stopping gracefully...')
  const options = url.parse(logoutUrl);
  options.headers = {
    cookie: session,
    referer: loginUrl
  };
  return new Promise((resolve, reject) => {
    https.request(options, resolve).on('error', reject).end();
    l('Logout request sent...');
  });
}).then(response => {
  l('Logout successful!');
  process.exit(0);
}).catch(e => {
  l(`Fatal error: ${e.stack}`);
  process.exit(1);
});
