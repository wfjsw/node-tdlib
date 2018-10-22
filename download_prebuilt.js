const rp = require('request-promise-native')
const zlib = require('zlib')
const fs = require('fs')

const { tdlib } = require('./package.json')

const arch_version = `${process.platform}-${process.arch}`

const url = {
    main: `https://github.com/wfjsw/node-tdlib/releases/download/v${tdlib.version}/tdlib-v${tdlib.version}-${tdlib.commit}-${tdlib.variant}-${arch_version}.node.gz`,
    debug: `https://github.com/wfjsw/node-tdlib/releases/download/v${tdlib.version}}/tdlib-v${tdlib.version}-${tdlib.commit}-${tdlib.variant}-${arch_version}-debug.node.gz`
}

async function checkAndDownload() {
    console.log(`Checking if build tdlib-v${tdlib.version}-${tdlib.commit}-${tdlib.variant}-${arch_version} exist...`)
    let head = await rp({
        method: 'HEAD',
        url: tdlib.debug ? url.debug : url.main,
        resolveWithFullResponse: true,
        simple: false
    })
    if (head.statusCode == 301 || head.statusCode == 302) {
        console.log('Build exist. Downloading...')
        rp.get(tdlib.debug ? url.debug : url.main).pipe(zlib.createGunzip()).pipe(fs.createWriteStream('./tdlib.node')).on('finish', () => {
            process.exit(0)
        })
    } else {
        console.log('Build does not exist. Trying to compile...')
        process.exit(1)
    }
}

checkAndDownload()

