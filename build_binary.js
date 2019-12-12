// @ts-nocheck
const fs = require('fs')
const cp = require('child_process')
const { tdlib } = require('./package.json')

console.log('Downloading tdlib...')

cp.execSync('rm -fR td && git clone https://github.com/tdlib/td.git && cd td && git checkout ' + tdlib.commit + ' && cd ../', {stdio: 'ignore'})

console.log('Launching compiler, please wait...')

let cmdline = 'cmake-js compile -C'
if (tdlib.debug) cmdline += ' -D'

cp.execSync(cmdline)

console.log('Moving artifact into correct location...')

fs.renameSync(`./build/${tdlib.debug ? 'Debug' : 'Release'}/tdlib.node`, './tdlib.node')

console.log('Cleaning up...')

cp.execSync('rm -fR build && rm -fR td', {stdio: 'ignore'})

process.exit(0)
