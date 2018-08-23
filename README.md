dslogger
========

Dead simple logger for nodejs

Install
-------

```
npm install dslogger --save
```

Example
-------

```js
const Logger = require('dslogger')
const logger = new Logger()

logger.debug('debug') //[2016-12-23 01:46:23] [info] [app.js 2]: info
logger.info('info')
logger.warn('warn')
logger.error('error')
```

Methods
-------

```js
const Logger = require('dslogger')
const logger = new Logger()
```

### logger.setLevel( level )

Avaliable log levels are: 'debug', 'info', 'warn', 'error'

### logger.setType( type, format )

```js
logger.setType('plain', '[%t] [%l] [%f %line:%c]: ')
logger.setType('json')
```

Available field are: 

- level: %l, %level
- time: %t, %time
- fileName: %f, %file
- lineNumber: %line
- columnNumber: %c, %column

### logger.debug( msg )
### logger.info( msg )
### logger.warn( msg )
### logger.error( msg )

Log the message, the format is 'prefix + msg'

Custom log
----------
By default, logs will print to stdout. Maybe you want to overwrite the `.doPrint` method to to do custom log.

```js
const fs = require('fs')
const logger = new Logger({
    doPrint: function(level, msg) {
        fs.appendFile('./logger.log', msg + '\n', function() {})
    }
})
```

License
-------

MIT
