// @ts-nocheck
const fs = require('fs')
const {spawn, execSync} = require('child_process');
const {tdlib} = require('./package.json')

console.log('Downloading tdlib...')

execSync('git clone https://github.com/tdlib/td.git && cd td && git checkout ' + tdlib.commit + ' && cd ../', {stdio: 'ignore'})

console.log('Launching compiler, please wait...')

let cmd = 'cmake-js'
let cmdOptions = ['compile', '-C']
if (tdlib.debug) cmdOptions.push('-D')

let cmakeJs = spawn(cmd, cmdOptions)
cmakeJs.stdout.on('data', (data) => console.log(data.toString()))
cmakeJs.stderr.on('data', (data) => console.error(data.toString()))
cmakeJs.on('exit', function (code) {
    if (code === 0) {
        console.log('Moving artifact into correct location...')

        fs.renameSync(`./build/${tdlib.debug ? 'Debug' : 'Release'}/tdlib.node`, './tdlib.node')
    }

    console.log('Cleaning up...')

    execSync('rm -fR build && rm -fR td', {stdio: 'ignore'})

    process.exit(0)
})