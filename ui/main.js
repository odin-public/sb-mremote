import { Buffer } from 'buffer';
import crypto from 'crypto';
import { resolve as urlResolve } from 'url';

import Promise from 'bluebird';
import moment from 'moment';
import { Builder as xmlBuilder } from 'xml2js';
import jszip from 'jszip';

import { xml } from './static.json';
import processDump from './processDumpClassic.js';

const KEY_ENTER = 13,
  HTTP = {
    OK: 200
  },
  SB_DUMP_LOCATION = urlResolve(window.location.href, 'daemon/'),
  BUTTON_TEXT = start.textContent,
  perf = window.performance,
  l = new class {

    _button = start;
    _logSpan = window['log-span'];

    _log(text, color) {
      const item = document.createElement('span'),
        logSpan = this._logSpan;

      item.setAttribute('style', `color: ${color};`);
      item.innerHTML = `[${moment().format('HH:mm:ss.SSS')}] ${text}`;
      logSpan.insertBefore(item, logSpan.firstChild);
      logSpan.insertBefore(document.createElement('br'), logSpan.firstChild);
    }

    info(text) { this._log(text); }

    success(text) { this._log(`<b>${text}</b>`, 'green'); }

    error(text) { this._log(`<b>Error: ${text}</b>`, 'red'); }

    button(text, type = 'info') {
      this._button.innerHTML = text;

      if (type in this) this[type](text);
    }
  };

function getFormValues() {
  const result = { 'putty-nodes': 'puttyNodesSession', 'putty-ves': 'puttyVEsSession', 'folder-name': 'folderName' };

  Object.entries(result).forEach(([ key, value ]) => {
    const field = window[key];

    result[value] = field.value || field.placeholder;
    delete result[key];
  });

  return result;
}

const xmlItem = {
  header() {
    return Object.assign({}, xml.header);
  }
};

function fetchSBDump(input, init) {
  return Promise.resolve(fetch(urlResolve(SB_DUMP_LOCATION, input), init));
}

function getConfig(event) {
  event.preventDefault();
  start.disabled = true;
  l.info('Working... <i>Note: your browser may hang at various stages of the process. This is considered normal!</i>');

  const dumpRequestTime = perf.now();

  l.button('Dump request sent...');

  fetchSBDump('.').then(response => {
    const { status } = response;

    if (status !== HTTP.OK) {
      return response.text().then(body => {
        let errorMessage = `Daemon returned HTTP code '${status}' (should be '${HTTP.OK}')`;

        try {
          errorMessage += `, message: ${JSON.parse(body).message}`;
        } catch(_) {
          errorMessage += `, body: ${body}`;
        }
        
        throw new Error(errorMessage);
      });
    }

    return response.json();
  }).then(dump => {
    if (dump.length === 0) { l.error('Received dump is empty. Nothing to do!'); return; }

    l.button(`Received ${dump.length} records. Processing...`);

    const form = getFormValues(),
      header = xmlItem.header(),
      xmlObject = processDump(dump, form, l);

    l.button('Generating XML...');

    const xmlDocument = new xmlBuilder({ xmldec: { version: '1.0', encoding: 'utf-8' }}).buildObject({ Connections: { $: header, Node: xmlObject }});

    l.button('Zipping up the config...');

    return [form, new jszip().file(`${form.folderName}.xml`, xmlDocument).generateAsync({ type: 'base64', compression: 'DEFLATE' })];
  }).spread((form, zipFile) => {
    const downloadPanel = window['download-panel'],
      downloadLink = window['download-link'];

    downloadLink.href = `data:application/octet-stream;base64,${zipFile}`;
    downloadLink.download = downloadLink.innerHTML = `${form.folderName}.zip`;
    downloadPanel.hidden = false;

    l.success('Success! Download the config, right-click \'Connections\' mRemoteNG node and click \'Import\', then select it!');
  }).catch(({ message }) => l.error(message)).finally(() => {
    l.info(`Time spent on the last operation: ${(perf.now() - dumpRequestTime) / 1000} seconds.`);
    start.disabled = false;
    l.button(BUTTON_TEXT, null);
  });
}

l.info('Checking sandbox dump daemon...');

fetchSBDump('uptime').then(response => {
  const { status } = response;

  if (status !== HTTP.OK) { l.button(`Daemon did not respond properly (HTTP '${status}' was received)!`, 'error'); return; }

  response.json().then(({ message }) => {
    l.button(BUTTON_TEXT, null)
    start.disabled = false;
    l.info(`Daemon is ready (up for <b>${moment.duration(message, 'seconds').humanize()}</b>)!`);
  });
});

window['main-form'].addEventListener('submit', getConfig);
document.addEventListener('keydown', ({ keyCode }) => { if (keyCode === KEY_ENTER) start.click(); });
