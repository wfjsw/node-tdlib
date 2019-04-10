// @ts-nocheck
const fs = require('fs')
const cp = require('child_process')
const { tdlib } = require('./package.json')

console.log('Launching compiler, please wait...')

let cmdline = 'cmake-js compile -C'
if (tdlib.debug) cmdline += ' -D'

cp.execSync(cmdline)

console.log('Moving artifact into correct location...')

fs.renameSync(`./build/${tdlib.debug ? 'Debug' : 'Release'}/tdlib.node`, './tdlib.node')

process.exit(0)
