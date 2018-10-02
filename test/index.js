const assert = require('assert')
const util = require('util')
const dslogger = require('../')

const logger = dslogger.logger

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


console.log('done')