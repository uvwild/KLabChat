// r2d2 main app creates the server instance
//
// class name hack  http://stackoverflow.com/questions/332422/how-do-i-get-the-name-of-an-objects-type-in-javascript
Object.prototype.getName = function () {
    var funcNameRegex = /function (.{1,})\(/;
    var results = (funcNameRegex).exec((this).constructor.toString());
    return (results && results.length > 1) ? results[1] : "-";
};

var config = require('./config.js'),
    socketServer = require('../../server/vws.socket.js').server,
    createUID = require('../../server/vws.socket.js').createUID;
    chatserver = require('../../server/chatserver.js').chatserver;

// kind if an interface definition for server api
var defaultSocketServerFunction = function (connection, server) {

    connection.on('open', function (id) {
        console.log('[open]');
    });

    connection.on('message', function (msg) {
        console.log('[message]');
        console.log(msg);
        connection.send(msg.utf8Data);
    });

    connection.on('error', function (err) {
        console.log(err);
    });

    connection.on('close', function () {
        console.log('[close]' + connection.getName());
    });


}

// print process.argv
process.argv.forEach(function (val, index, array) {
//    console.log(index + ': ' + val);
    if (parseInt(val))
        config.port = val;
});
if (process)
// runit with my chatserver
socketServer('chaton-'+ config.port, chatserver).config(config);
