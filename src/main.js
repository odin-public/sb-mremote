function capitalize(string) {
  string = String(string);
  return string.charAt(0).toUpperCase() + string.substring(1);
}
var xmlItem = '{"Name":"","Type":"Container","Expanded":"False","Descr":"","Icon":"mRemoteNG","Panel":"General","Username":"","Domain":"","Password":"","Hostname":"","Protocol":"SSH2","PuttySession":"Default Settings","Port":"22","ConnectToConsole":"False","UseCredSsp":"True","RenderingEngine":"IE","ICAEncryptionStrength":"EncrBasic","RDPAuthenticationLevel":"NoAuth","LoadBalanceInfo":"","Colors":"Colors16Bit","Resolution":"FitToWindow","AutomaticResize":"True","DisplayWallpaper":"False","DisplayThemes":"False","EnableFontSmoothing":"False","EnableDesktopComposition":"False","CacheBitmaps":"True","RedirectDiskDrives":"False","RedirectPorts":"False","RedirectPrinters":"False","RedirectSmartCards":"False","RedirectSound":"DoNotPlay","RedirectKeys":"False","Connected":"False","PreExtApp":"","PostExtApp":"","MacAddress":"","UserField":"","ExtApp":"","VNCCompression":"CompNone","VNCEncoding":"EncHextile","VNCAuthMode":"AuthVNC","VNCProxyType":"ProxyNone","VNCProxyIP":"","VNCProxyPort":"0","VNCProxyUsername":"","VNCProxyPassword":"","VNCColors":"ColNormal","VNCSmartSizeMode":"SmartSAspect","VNCViewOnly":"False","RDGatewayUsageMethod":"Never","RDGatewayHostname":"","RDGatewayUseConnectionCredentials":"Yes","RDGatewayUsername":"","RDGatewayPassword":"","RDGatewayDomain":"","InheritCacheBitmaps":"False","InheritColors":"False","InheritDescription":"False","InheritDisplayThemes":"False","InheritDisplayWallpaper":"False","InheritEnableFontSmoothing":"False","InheritEnableDesktopComposition":"False","InheritDomain":"False","InheritIcon":"False","InheritPanel":"False","InheritPassword":"False","InheritPort":"False","InheritProtocol":"False","InheritPuttySession":"False","InheritRedirectDiskDrives":"False","InheritRedirectKeys":"False","InheritRedirectPorts":"False","InheritRedirectPrinters":"False","InheritRedirectSmartCards":"False","InheritRedirectSound":"False","InheritResolution":"False","InheritAutomaticResize":"False","InheritUseConsoleSession":"False","InheritUseCredSsp":"False","InheritRenderingEngine":"False","InheritUsername":"False","InheritICAEncryptionStrength":"False","InheritRDPAuthenticationLevel":"False","InheritLoadBalanceInfo":"False","InheritPreExtApp":"False","InheritPostExtApp":"False","InheritMacAddress":"False","InheritUserField":"False","InheritExtApp":"False","InheritVNCCompression":"False","InheritVNCEncoding":"False","InheritVNCAuthMode":"False","InheritVNCProxyType":"False","InheritVNCProxyIP":"False","InheritVNCProxyPort":"False","InheritVNCProxyUsername":"False","InheritVNCProxyPassword":"False","InheritVNCColors":"False","InheritVNCSmartSizeMode":"False","InheritVNCViewOnly":"False","InheritRDGatewayUsageMethod":"False","InheritRDGatewayHostname":"False","InheritRDGatewayUseConnectionCredentials":"False","InheritRDGatewayUsername":"False","InheritRDGatewayPassword":"False","InheritRDGatewayDomain":"False"}',
  configs = {
    'lin-ct-clean': {},
    'lin-ct7-clean': {},
    'lin-mn': {
      'ep': ['endpoint']
    },
    'lin-pba': {
      'ep': ['endpoint'],
      'pba': ['pba']
    },
    'lin-default': {
      'ep': ['endpoint'],
      'pim': ['pim'],
      'mysql': ['mysql'],
      'dns': ['dns'],
      'ng': ['lsh']
    },
    'lin-exch2010': {
      'cp': ['cp'],
      'pba': ['pba'],
      'ep': ['endpoint'],
      'mysql': ['mysql'],
      'dns': ['dns'],
      'ng': ['lsh'],
      'ad1': ['ad1', 'rdp'],
      'iis': ['iis', 'rdp'],
      'wpe': ['wpe', 'rdp']
    },
    'lin-iis': {
      'dns': ['dns'],
      'ep': ['endpoint'],
      'ad1': ['ad1', 'rdp'],
      'iis71': ['iis71', 'rdp'],
      'wpe': ['wpe', 'rdp']
    },
    'lin-mn-for-aps1.x': {
      'ep': ['endpoint'],
      'pba': ['pba']
    },
    'lin-mn-spconfig': {
      'ep': ['endpoint']
    },
    'lin-pba-lsh': {
      'cp': ['cp'],
      'pba': ['pba'],
      'ep': ['endpoint'],
      'mysql': ['mysql'],
      'dns': ['dns'],
      'store': ['store'],
      'pbadb': ['pbadb']
    },
    'lin-qmail': {
      'cp': ['cp'],
      'pba': ['pba'],
      'ep': ['endpoint'],
      'mysql': ['mysql'],
      'dns': ['dns'],
      'ng': ['lsh'],
      'pim': ['pim'],
      'qmail': ['qmail'],
      'imp': ['imp'],
      'spas': ['spamassassin'],
      'drweb': ['drweb']
    },
    'win-mn': {
      'win-mn': ['mn', 'rdp']
    }
  },
  unknownConfigs = {},
  Promise = require('bluebird'),
  xml2js = Promise.promisifyAll(require('xml2js')),
  jszip = require('jszip'),
  Buffer = require('buffer').Buffer,
  cryptoModule = require('crypto'),
  l = (function() {
    var button = start,
      logSpan = window['log-span'];

    function log(data, color) {
      while (logSpan.lastChild) {
        logSpan.removeChild(logSpan.lastChild);
      }
      var item = document.createElement('span');
      item.style = 'color: ' + color + ';';
      item.innerHTML = data;
      logSpan.insertBefore(item, null);
    }
    return {
      info: data => {
        return log(data);
      },
      error: data => {
        return log('<b>Error: ' + data + '</b>', 'red');
      },
      button: data => {
        button.innerHTML = data;
        return;
      }
    };
  })(),
  fl = new FileReader(),
  xmlConfig,
  sandboxes,
  containerItem = JSON.parse(xmlItem),
  connectionItem = Object.assign({}, containerItem);
connectionItem.Type = 'Connection';
delete connectionItem.Expanded;
window['main-form'].addEventListener('submit', e => {
  e.preventDefault();
  if (start.disabled)
    return;
  if (config.files.length === 0) {
    l.error('Please select your \'confCons.xml\'!');
    return;
  }
  start.disabled = true;
  l.info('');
  var req = new XMLHttpRequest();
  new Promise((resolve, reject) => {
    req.open('get', './dump');
    req.addEventListener('load', resolve);
    req.addEventListener('error', reject);
    req.send();
    l.button('Sandbox dump request sent...');
  }).then(() => {
    try {
      sandboxes = JSON.parse(req.response);
    } catch (e) {
      throw new Error('Could not parse response: ' + e.message);
    }
    l.button('Response received! ' + sandboxes.length + ' records. Reading config file...');
    return new Promise((resolve, reject) => {
      fl.readAsText(config.files[0]);
      fl.onload = resolve;
      fl.onerror = reject;
    }).catch(reason => {
      throw new Error('Unable to read file: ' + reason.message);
    });
  }).then(() => {
    l.button('Parsing config file...');
    return xml2js.parseStringAsync(fl.result).catch(reason => {
      throw new Error('Unable to parse config file: ' + reason.message);
    });
  }).then(config => {
    l.button('Processing config and sandbox dump...');
    xmlConfig = config;
    var folderName = folder.value || folder.placeholder,
      puttyNodes = window['putty-nodes'].value || window['putty-nodes'].placeholder,
      puttyVEs = window['putty-ves'].value || window['putty-ves'].placeholder,
      orgs = {},
      orgsOrdered = [];
    sandboxes.forEach(v => {
      var [name, org] = v.name.split('.'),
        dir = orgs[org],
        node = v.node,
        hosts = configs[v.configuration],
        shared = {
          password: v.password,
          description: `${v.poa}/${v.pba || 'none'}`,
          panel: `${folderName}: ${name}.${org}`
        };
      if (!hosts) {
        var names = unknownConfigs[v.configuration];
        if (!names)
          names = unknownConfigs[v.configuration] = [];
        names.push(v);
      }
      if (!dir) {
        orgs[org] = dir = [];
        orgsOrdered.push(org);
      }
      if (!node)
        node = 'nodeXX.apsdemo.org';
      dir.push(Object.assign({}, shared, {
        name: name,
        host: v.name,
        type: 'ssh'
      }));
      for (var k in hosts) {
        var v1 = hosts[k];
        dir.push(Object.assign({}, shared, {
          name: `${name}.${k}`,
          host: `${v1[0]}.${v.name}`,
          type: v1[1] || 'ssh'
        }));
      }
      dir.push(Object.assign({}, {
        name: capitalize(node.split('.')[0]),
        host: node,
        type: 'ssh',
        panel: shared.panel,
        description: '',
        node: true
      }));
    });
    orgsOrdered.sort();
    var rootNode = (function findFolder(root, folder) {
      var attr = root.$;
      if (attr && attr.Name === folder && attr.Type !== 'Connection')
        return root;
      var result;
      for (var k in root) {
        var v = root[k];
        if (k === '$')
          continue;
        result = findFolder(v, folder);
        if (result)
          return result;
      }
    })(xmlConfig, folderName);
    if (!rootNode)
      throw new Error(`Unable to find folder '${folderName}' inside the config!`);
    if (!rootNode.Node)
      rootNode.Node = [];
    rootNode = rootNode.Node;
    var alg = 'aes-128-cbc',
      iv = cryptoModule.randomBytes(16),
      key = new Buffer('c8a39de2a54766a0da875f79aaf1aa8c', 'hex');
    orgsOrdered.forEach(v => {
      var org = v,
        hosts = orgs[v],
        orgNode = {
          $: Object.assign({}, containerItem, {
            Name: org,
            Expanded: 'False'
          }),
          Node: []
        };
      hosts.forEach(v => {
        var connection = (v.type === 'rdp' ? {
          Protocol: 'RDP',
          Port: 3389,
          Username: 'Administrator'
        } : {
          Protocol: 'SSH2',
          Port: 22,
          Username: 'root'
        });
        Object.assign(connection, {
          Name: v.name,
          Descr: v.description,
          Hostname: v.host,
          Panel: v.panel
        });
        if (v.node) {
          connection.PuttySession = puttyNodes;
        } else {
          connection.PuttySession = puttyVEs;
          var enc = cryptoModule.createCipheriv(alg, key, iv);
          connection.Password = Buffer.concat([iv, enc.update(v.password), enc.final()]).toString('base64');
        }
        orgNode.Node.push({
          $: Object.assign({}, connectionItem, connection)
        });
      });
      rootNode.push(orgNode);
    });
    l.info(`Success: <a href="data:application/octet-stream;base64,${(new jszip()).file('confCons.xml', (new xml2js.Builder({xmldec: {'version': '1.0', 'encoding': 'utf-8'}})).buildObject(xmlConfig)).generate({type:'base64', compression: 'DEFLATE'})}" download="confCons.zip">confCons.zip</a>`);
    if (Object.keys(unknownConfigs).length > 0)
      console.log(unknownConfigs);
  }).catch(reason => {
    l.error(reason.message || reason);
  }).finally(() => {
    start.disabled = false;
    start.innerHTML = 'Get Config!';
  });
});
document.addEventListener('keydown', e => {
  if (e.keyCode == 13)
    start.click();
});
