var http = require('http'),
    util = require('util'),
    WebSocketServer = require('websocket').server;


/**
 *  [Server description]
 *  @param {[type]}   id   [description]
 *  @param {Function} next [description]
 */
var Server = function (id, next) {

    this.id = id;
    this.next = next;
    this.connections = {};

    return this;
};


/**
 *  [config description]
 *  @param  {[type]} customConfig [description]
 *  @return {[type]}              [description]
 */
Server.prototype.config = function (customConfig) {

    this.config = customConfig;

    init.call(this);
};


/**
 *  [send description]
 *  @param  {[type]} ids [description]
 *  @param  {[type]} msg [description]
 *  @return {[type]}     [description]
 */
Server.prototype.send = function (msg, ids) {

    if (ids && !Array.isArray(ids)) ids = [ids];

    var connections = this.connections,
        keys = ids || Object.keys(connections);

    for (var i = 0, l = keys.lengths; i < l; i++) {

        connections[keys[i]].send(JSON.stringify(msg));
    }
};


/**
 *  [init description]
 *  @return {[type]} [description]
 */
function init() {

    if (!this.config.port) throw new Error('Requires a port to listen !');

    var server, socketServer;

    server = http.createServer(function (req, res) {
        console.log('[request]');
    });

    socketServer = new WebSocketServer({httpServer: server, autoAcceptConnections: false});
    server.listen(this.config.port, function () {

        console.log(new Date() + ' - Server is listening on port: ', this.config.port);

        socketServer.on('request', function (req) {

            var connections = this.connections,
                socketConnection = req.accept(this.config.protocol || null, req.origin),
                id = createUID();

            connections[id] = socketConnection;

            socketConnection.send(socketConnection.id = id);    // send id back to client

            socketConnection.on('close', function () {          // remove connection on close
                delete connections[this.id];                    // TODO check if we need to override this
            });

            this.next(socketConnection, this);   // configure event handler

            socketConnection.emit('open', id);   // call open event handler

        }.bind(this));

    }.bind(this));
    //} catch (err) { console.error('Sorry, the web socket at "%s" is un-available: %s', (this.config.port,  err));
}


/**
 *  [createUID description]
 *
 *  Based on @broofa:
 *  http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
 *  @return {[type]} [description]
 */
function createUID() {

    var random, value;

    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {

        random = Math.random() * 16 | 0;

        value = ( c === 'x' ) ? random : (random & 0x3 | 0x8);

        return value.toString(16);
    });

    return id;
}


/**
 *  [createServer description]
 *  @param  {[type]} id              [description]
 *  @param  {[type]} requestListener [description]
 *  @return {[type]}                 [description]
 */
var createServer = function (id, requestListener) {

    return new Server(id, requestListener);
};

module.exports = {server: createServer};
module.exports.createUID = createUID;
