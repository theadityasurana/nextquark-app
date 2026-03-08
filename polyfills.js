if (typeof document === 'undefined') {
  global.document = { currentScript: null };
}

if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}
