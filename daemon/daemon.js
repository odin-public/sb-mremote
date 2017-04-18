if (require.main !== module) throw new Error('This file must be executed directly!');

import { parse as urlParse, resolve as urlResolve } from 'url';
import { createServer } from 'http';
import { randomBytes } from 'crypto';

import Promise from 'bluebird';
import readCallback from 'read';
import request from 'request-promise';

import config from './config.json';

const HTTP = {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
  },
  BASE_URL = 'https://dev.apsstandard.org/',
  URL = {
    LOGIN: '/develop/admin/',
    LOGOUT: '/develop/admin/logout/',
    SB_DUMP: '/develop/admin/catalog/apscataloguser/sandboxes-dump'
  },
  STRICT_SSL = config.strictSSL,
  PROXY_REAL_IP_HEADER = config.proxyRealIPHeader,
  LISTEN = {
    HOST: config.listen.host,
    PORT: config.listen.port
  };

for (let key in URL) {
  URL[key] = urlResolve(BASE_URL, URL[key]);
}

function l(text) {
  return process.stdout.write(`[${new Date()}] ${String(text)}\n`);
}

const cookies = request.jar(),
  read = Promise.promisify(readCallback),
  requestPortal = request.defaults({ resolveWithFullResponse: true, jar: cookies, simple: false, strictSSL: STRICT_SSL });

let isLoggedIn = false,
  serverTiming;

function login(username, password) {
  l(`Attempting to login as: '${username}'...`);

  return requestPortal.post({
    url: URL.LOGIN,
    headers: { referer: URL.LOGIN },
    form: {
      csrfmiddlewaretoken: cookies.getCookies(URL.LOGIN).find(({ key }) => key === 'csrftoken').value,
      username,
      password,
      this_is_the_login_form: 1
    }
  }).then(response => {
    const session = response.headers['set-cookie'].find(v => v.startsWith('apssession='));

    if (!session) {
      throw new Error('No \'apssession\' cookie found in response');
    }

    isLoggedIn = true;

    l('Login successful!');
  });
}

function logout() {
  if (!isLoggedIn) {
    l('Not logged in!');

    return Promise.resolve();
  }

  l('Logging out...');

  return requestPortal.get({
    url: URL.LOGOUT,
    referer: URL.LOGIN
  }).then(({ statusCode }) => {
    if (statusCode !== HTTP.OK) {
      throw new Error(`Logout URL returned HTTP code '${statusCode}' (should be '${HTTP.OK}')!`);
    }

    isLoggedIn = false;

    l('Logout successful!');
  });
}

function stop() {
  l('Stopping...')
  logout().finally(() => process.exit(0));
}

function unexpectedError(error) {
  l(`Unexpected failure: ${error.stack}.`);
  stop();
}

process
  .on('SIGINT', () => {
    l('Received a \'SIGINT\'!');
    stop();
  })
  .on('SIGTERM', () => {
    l('Received a \'SIGTERM\'!');
    stop();
  })
  .on('uncaughtException', unexpectedError)
  .on('unhandledRejection', unexpectedError);

Promise.join(requestPortal.get(URL.LOGIN), read({ prompt: `'${urlParse(BASE_URL).host}' Username: ` }).then(username => {
  if (username.length === 0) throw new Error('Username cannot be empty');

  return [username, read({ prompt: 'Password: ', silent: true, replace: '*' }).then(password => {
    if (password.length === 0) throw new Error('Password cannot be empty');

    return password;
  })];
}).all()).spread((response, [username, password]) => {
  return [username, password, login(username, password)];
}).spread((username, password) => {
  l(`Attempting to bind: '${LISTEN.HOST}:${LISTEN.PORT}'...`);
  l(`Will try to infer client IP from '${PROXY_REAL_IP_HEADER}' header...`);

  const server = createServer((request, response) => {
    const { url, headers, socket } = request,
      id = randomBytes(2).toString('hex'),
      timing = process.hrtime(),
      ip = PROXY_REAL_IP_HEADER in headers ? headers[PROXY_REAL_IP_HEADER] : socket.remoteAddress;

    l(`Incoming request from '${ip}'. Assigned ID: '${id}'...`);

    function lRequest(text) { return l(`[${id}] ${text}`); }
    function elapsed() { return parseFloat(process.hrtime(timing).join('.')); }

    response
      .on('error', error => lRequest(`Response error: ${error.message}`))
      .on('finish', () => lRequest(`Request was handled in ${elapsed()} seconds!`))
      .setHeader('content-type', 'application/json');

    if (url === '/stop') {
      lRequest('Graceful stop was requested!');
      response.statusCode = HTTP.OK;
      response.end(JSON.stringify({ message: `Stopping gracefully...` }), () => stop());

      return;
    }

    if (url === '/uptime') {
      let uptime = process.hrtime(serverTiming)[0];

      lRequest(`Uptime was requested (${uptime} seconds)!`);

      response.statusCode = HTTP.OK;
      response.end(JSON.stringify({ message: uptime }));

      return;
    }

    if (url !== '/') {
      lRequest(`Unknown request URL: '${url}'! Sending '${HTTP.NOT_FOUND}'.`);
      response.statusCode = HTTP.NOT_FOUND;
      response.end(JSON.stringify({ message: `The requested path was not found!` }));

      return;      
    }

    if (!isLoggedIn) {
      lRequest('Not logged in yet, can\'t get the sandbox dump!');
      response.statusCode = HTTP.SERVER_ERROR;
      response.end(JSON.stringify({ message: `Not logged into the portal yet. Try again later!` }));

      return;
    }

    let ongoing;

    function getSBDump(reloginAttempted) {
      lRequest('Requesting a sandbox dump...');

      return ongoing = requestPortal.get({ url: URL.SB_DUMP, json: false }).then(({ statusCode, body }) => {
        if ([HTTP.UNAUTHORIZED, HTTP.FORBIDDEN].includes(statusCode) && !reloginAttempted) {
          lRequest(`Received a credential error (HTTP code '${statusCode}'), attempting to login again..`);

          return login(username, password).then(() => getSBDump(true));
        }

        if (statusCode !== HTTP.OK) {
          const error = new Error(`Sandbox dump URL responded with: '${body}`);

          error.code = statusCode;
          lRequest(`Sandbox dump request returned with HTTP '${statusCode}' (should be '${HTTP.OK}')!`);

          throw error;
        }

        return body;
      });
    }

    getSBDump(false).then(sbDump => {
      lRequest('Sandbox dump received! Responding to request...');
      response.statusCode = HTTP.OK;
      response.end(sbDump);
    }, error => {
      lRequest(`Failed to get sandbox dump: ${error.message}`);
      response.statusCode = 'code' in error ? error.code : HTTP.SERVER_ERROR;
      response.end(JSON.stringify({ message: `Failed to query sandbox dump URL: ${error.message}` }));
    });

    request.on('close', () => {
      lRequest(`Client has aborted its request (after ${elapsed()} seconds). Sandbox dump request was aborted.`);
      ongoing.cancel();
    });
  });

  return new Promise((resolve, reject) => server.on('error', reject).on('listening', resolve).listen(LISTEN.PORT, LISTEN.HOST));
}).then(() => {
  serverTiming = process.hrtime();
  l('Ready!');
});
