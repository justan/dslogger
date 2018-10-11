const assert = require('assert')
const dslogger = require('../')
const fs = require('fs')
const pt = require('path')

const logger = dslogger.logger

const _tmpFile = pt.join(__dirname, './log.log')

const oldoutwrite = process.stdout.write
const olderrwrite = process.stderr.write

let current = ''


process.stdout.write = function(str) {
    current += str
    return oldoutwrite.apply(process.stdout, arguments)
}

process.stderr.write = function(str) {
    current += str
    return olderrwrite.apply(process.stderr, arguments)
}

current = ''
var message = 'plain text'
logger.log(message)
assert.ok(current.indexOf(message) > -1)

current = ''
message = 'plain text'
var str1 = 'lala la'
logger.log(message, str1)
assert.ok(current.indexOf(message + ' ' + str1) > -1)

logger.setType('json')

logger.streams.push({
    level: 'warn',
    stream: fs.createWriteStream(_tmpFile, { flags: 'a', encoding: 'utf8' })
})

current = ''
message = 'json message'
logger.error(message)
let log = JSON.parse(current)
assert.equal(log.msg, message)
assert.equal(log.pid, process.pid)

current = ''
message = new Error('custom error')
message.code = 'ERR_CODE'
logger.error(message, 'extra')
log = JSON.parse(current)
assert.equal(log.msg, 'custom error extra')
assert.equal(log.err.code, message.code)
current = ''
logger.error({ err: message }, 'extra')
log = JSON.parse(current)
assert.equal(log.msg, 'custom error extra')
assert.equal(log.err.code, message.code)


fs.unlinkSync(_tmpFile)
console.log('done')