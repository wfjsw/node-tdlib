const request = require('request')
const zlib = require('zlib')
const fs = require('fs')

const url = {
    main: 'https://github.com/wfjsw/node-tdlib/releases/download/v1.3.0/tdlib-v1.3.0-patch370-napi-x86_64.node.gz',
    debug: 'https://github.com/wfjsw/node-tdlib/releases/download/v1.3.0/tdlib-v1.3.0-patch370-napi-x86_64-debug.node.gz'
}

const debug = false

request.get(debug ? url.debug : url.main).pipe(zlib.createGunzip()).pipe(fs.createWriteStream('./tdlib.node'))
