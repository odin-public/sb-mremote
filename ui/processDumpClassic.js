// Classic sandbox dump processor

import { randomBytes, createCipheriv } from 'crypto';
import { Buffer } from 'buffer';

import util from './util.js';
import { xml, configVEs } from './static.json';

const DEFAULT_PROTOCOL = 'ssh',
  UNKNOWN_NODE_ATTRIBUTES = { Name: 'Unknown Node', Hostname: 'unknown.apsdemo.org' },
  ENCRYPTION_KEY = new Buffer('c8a39de2a54766a0da875f79aaf1aa8c', 'hex'); // md5 of 'mR3m'

function createOrGet(target, key, value) {
  if (key in target) {
    return target[key];
  }

  return target[key] = value;
}

function encryptPassword(password) {
  const iv = randomBytes(16),
    cipher = createCipheriv('aes-128-cbc', ENCRYPTION_KEY, iv);

  return Buffer.concat([iv, cipher.update(password), cipher.final()]).toString('base64');
}

const xmlItem = {
  container() {
    return { $: Object.assign({}, xml.item, xml.type.container), Node: [] };
  },

  connection(protocol) {
    return { $: Object.assign({}, xml.item, xml.type.connection, xml.protocol[protocol || DEFAULT_PROTOCOL]) };
  }
};

function processDump(dump, form, l) {
  const { puttyNodesSession, puttyVEsSession, folderName } = form,
    result = [],
    organizations = {},
    organizationIDs = [],
    unknownConfigs = {};

  dump.forEach(sandbox => {
    let // full list: { admins, configuration, developers, ip, lastUsed, name, node, password, pba, persistent, poa, provisionStatus, requestor, status } = sandbox,
      { configuration, ip, name, node, password, pba, poa } = sandbox,
      hostname = name,
      nameParts = name.split('.'),
      organization = nameParts[1];

    name = nameParts[0];

    const sharedData = { // Both VE and hardware node data
        Password: encryptPassword(password),
        Descr: `${poa}/${pba || 'none'}:${configuration}@${ip}`,
        Panel: `${folderName}: ${name}.${organization}`
      },
      organizationFolder = createOrGet(organizations, organization, []),
      nodes = { '': ['mn'] };

    if (organizationFolder.length === 0) organizationIDs.push(organization);

    if (configuration in configVEs) {
      Object.assign(nodes, configVEs[configuration])
    } else {
      createOrGet(unknownConfigs, configuration, []).push(sandbox);
    }

    Object.entries(nodes).forEach(([ veName, [ vePrefix, protocol ]]) => { // VE entries
      const veItem = xmlItem.connection(protocol),
        attributes = veItem.$;
      
      attributes.Name = `${name}${veName.length === 0 ? '' : '.' + veName}`;
      attributes.Hostname = `${vePrefix}.${hostname}`;
      attributes.PuttySession = puttyVEsSession;
      Object.assign(attributes, sharedData);

      organizationFolder.push(veItem);
    });

    const nodeItem = xmlItem.connection('ssh'), // Hardware node
      attributes = nodeItem.$;

    attributes.PuttySession = puttyNodesSession;
    Object.assign(attributes, sharedData);
    attributes.Password = ''; // key auth

    if (util.isNull(node)) {
      Object.assign(attributes, UNKNOWN_NODE_ATTRIBUTES);
    } else {
      attributes.Name = util.capitalize(node.split('.')[0])
      attributes.Hostname = node;
    }

    organizationFolder.push(nodeItem);
  });

  if (Object.keys(unknownConfigs).length > 0) {
    console.error(unknownConfigs);
    l.error('Some unknown sandbox configurations were found. Take a look at the console!');
  }

  l.info(`Found ${organizationIDs.length} organizations!`);

  organizationIDs.sort().forEach(organizationID => { 
    const containerItem = result[organizationID] = xmlItem.container(),
      attributes = containerItem.$;

    attributes.Name = organizationID;
    containerItem.Node = organizations[organizationID];
  });

  return result;
}

export default processDump;
