import coreUtil from 'util';
import url from 'url';

import utilIs from 'core-util-is';

const util = Object.assign({}, coreUtil, utilIs, {
  capitalize(string) {
    string = String(string);

    return string.charAt(0).toUpperCase() + string.substring(1);
  }
});

module.exports = util; // allows imports like { name }
export default util;
