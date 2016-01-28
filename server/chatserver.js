/**
 * Created by uv on 27.01.2016 for r2d2
 */

var WebSocketConnection = require('websocket').connection,      // import the web connection type
    redis = require('redis');                                   // use redis for coordination

var defaultChannelName = 'defaultChannel';


var ChatServer = function (clientConnection, socketServer) {
//////////////////////////////////////////////////////////////////////////////////////////////////
// 2 redis clients
    this.id = socketServer.id;
    this.socketId = clientConnection.id;
    this.clientConnection = clientConnection;
    this.connections = socketServer.connections;
    this.pubsubClient = redis.createClient();
    this.messageClient = redis.createClient();
    this.socketServer = socketServer;
    this.defaultChannelName = defaultChannelName;

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // quick and dirty channel management  with global structure
    // TODO does it need to be shared with the other server instances?

    var defaultChannelInfo = {};
    defaultChannelInfo.created = Date.now();
    defaultChannelInfo.memberList = {};
    this.channelList = {};
    this.channelList[this.defaultChannelName] = defaultChannelInfo;

    console.log('created ChatServer for ' + id + ' socket id' + this.socketId);
    return this;
};

/**
 *  [config description]
 *  @param  {[type]} customConfig [description]
 *  @return {[type]}              [description]
 */
ChatServer.prototype.config = function (customConfig) {

    this.config = customConfig;

    init.bind(this)();

    return this;
};

function init() {
    var chatServer = this;
    // define subscribe callback
    this.pubsubClient.on('subscribe', function (channel, message) {
        console.log('####subscribed ' + message + ' on channel ' + channel);
        try {
            var msgData = JSON.parse(message);
        }
        catch (SyntaxError) {
            return false;
        }
    });

    this.pubsubClient.on('message', function (channel, message) {
        console.log('####received message ' + message + ' on channel ' + channel);
        try {
            var msgData = JSON.parse(message);
            chatServer.forwardMessagesToOtherGroupMembers(msgData, msgData.id, chatServer.socketServer);
        }
        catch (SyntaxError) {
            return false;
        }
    });

    this.messageClient.on('message', function (channel, message) {
        console.log('!!!!received message ' + message + ' on channel ' + channel);
        try {
            var msgData = JSON.parse(message);
        }
        catch (SyntaxError) {
            return false;
        }
    });

    this.messageClient.on('publish', function (channel, message) {
        console.log('!!!! publish ' + message + ' on channel ' + channel);
        try {
            var msgData = JSON.parse(message);
        }
        catch (SyntaxError) {
            return false;
        }
    });
    this.pubsubClient.subscribe(this.defaultChannelName);       // subscribe to defaultChannel
}

function initRedisClient() {
    var myRC = redis.createClient();
    //var redisAuth = function () {
    //    myRC.auth("dc64f7b818f4e3ec2e3d3d033e3e5ff4");
    //};
    //myRC.addListener('connected', redisAuth);
    //myRC.addListener('reconnected', redisAuth);
    //redisAuth();
    myRC.on('connect', function () {
        console.log('redis connected');
    });
    myRC.on("error", function (err) {
        console.log("Error " + err);
    });
    return myRC;
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// TODO this should probably be a class
// take the new connection from the server and add your own event handler
ChatServer.prototype.registerCallbacks = function (thisConnection) {

    var description = thisConnection.getName() + " - " + thisConnection.id + " @ " + this.id;
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>\nNEW " + description);
    var channelList = this.channelList;
    var connections = this.connections;
    var chatServer = this;
    thisConnection.on('open', function (id) {
        console.log('[open] ' + id + " : " + description);
        // TODO check if new and register new client in defaultChannel
        var defaultChannel = channelList[chatServer.defaultChannelName];
        var data = {
            author: thisConnection.id,
            channel: chatServer.defaultChannelName,
        };
        chatServer.joinChannel(data, thisConnection);      // register in default channel

        // TODO send last 10 messages if new
    });

    thisConnection.on('message', function (message) {
        // TODO store messages as LRU somewhere with sequential msgId -- check 24 hour lifetime
        console.log('[message] ' + description);
        console.log(message.utf8Data);

        var msgData = JSON.parse(message.utf8Data);
        var data = msgData.action.data[0];
        // get action command
        var command = msgData.action.command;
        var forwardMessageJson = JSON.stringify(msgData);
        switch (command) {
            case 'join':
                chatServer.joinChannel(data, thisConnection);
                break;
            case 'msg':
                // publish to redis
                console.log('>>>>>>>>>>>>>> PUBLISH to: ' + data.channel);
                chatServer.messageClient.publish(data.channel, forwardMessageJson);
                break;
            default:
                console.log('unknown')

        }
    });  // end off message callback

    thisConnection.on('error', function (err) {
        console.log(err + description);
    });

    thisConnection.on('close', function () {
        console.log('[close]' + description);
        // TODO remove connection
    });
}

function channelExist(channelData) {

}
// join a channel - it will be created if needed or user will be added to if needed
ChatServer.prototype.joinChannel = function (data, thisConnection) {
    if (data.channel.length > 0 && data.author.length > 0) {
        var channelData = this.channelList[data.channel];
        if (channelData === undefined) {                 // init NEW channel
            channelData = {};
            channelData.created = Date.now();           // creation date
            channelData.memberList = {};
            this.channelList[data.channel] = channelData;
            this.pubsubClient.subscribe(data.channel);       // subscribe to new channels
            console.log('SUBSCRIBED ' + data.channel);
        } else {
            console.log('channel ' + data.channel + ' existing  with ' + Object.keys(channelData.memberList).length + '  members');
        }
        if (channelData.memberList[data.author] == undefined) {   // init NEW memberinfo
            var memberInfo = {};
            memberInfo.created = Date.now();
            memberInfo.connId = thisConnection.id;
            channelData.memberList[data.author] = memberInfo;  // keep connection id for author TODO maybe overwrite?
            console.log('join new: ' + data.author + ' channel ' + data.channel + ' created ' + this.channelList[data.channel].created);
        } else {
            console.log('found ' + data.author + ' in channel ' + data.channel + ' created ' + this.channelList[data.channel].created);
        }
    }

}

ChatServer.prototype.canWrite2Channel = function (channel, connId) {       /// always write to defaultChannel.... or other channel
    if (channel == defaultChannelName)
        return true;
    var channelData = this.channelList[channel];
    if (channelData == undefined)
        return false;
    var keys = Object.keys(channelData.memberList);
    for (var i = 0; i < keys.length; i++) {
        var memberInfo = channelData.memberList[keys[i]];
        if (memberInfo != undefined && memberInfo.connId == connId) {
            return true; // we have a match
        }
    }
    return false;  // nothing found
}

// forward message to other local clients we keep records in our channel data only defaultChannel goes everywhere
ChatServer.prototype.forwardMessagesToOtherGroupMembers = function (msgData, curr_conn) {
    var data = msgData.action.data[0];
    msgData.action.command = 'messages';    // change command
    var forwardMessageJson = JSON.stringify(msgData);
    var keys = Object.keys(this.connections);
    console.log('messageDelay: ' + (Date.now() - msgData.action.data[0].timestamp) + '|| connections: ' + keys.length);
    //if (curr_conn != null) {
    //    if (msgData.id == curr_conn.id)
    //        return;
    //}
    if (curr_conn == undefined)
        console.log('DEBUG CURR connections unset : ' + this.clientConnection.id);
    if (curr_conn != null || this.clientConnection != curr_conn)
        console.log('DEBUG different connections : ' + this.clientConnection.id + ' : ' + curr_conn.id);
// single server approach: iteration over client connections
    for (var i = 0; i < keys.length; i++) {
        var conn = this.connections[keys[i]];
        if (conn instanceof WebSocketConnection) {
            // only send to other connections
            if (conn.id != curr_conn.id && conn.id != msgData.id) {
                if (this.canWrite2Channel(data.channel, conn.id)) { // check the destination channel!
                    console.log('>>>Sending MSG to: ' + conn.id + ' ' + forwardMessageJson);
                    conn.send(forwardMessageJson, function (err) {   /// problem with closure conn?
                        if (err != undefined) {
                            console.log('<<<<callback: ' + err);
                        } else {
                            console.log('<<<<<<<  success ' + data.channel + ' clientId: ' + conn.id);
                        }
                    });
                }
            }
        } else {
            console.log('WRONG CONNECTION TYPE');
            return;
        }
    }
//// TODO send message back to client to confirm maybe needed to avoid duplicate connections or whatever
//console.log('>>>Sending MSG back to : ' + connection.id + '-- ' + msgData.id);
//connection.send(message.utf8Data, function (err) {
//    if (err != undefined) {
//        console.log('callback: ' + err);
//    } else {
//        console.log('success selfId: ' + connection.id);
//    }
//});
}

// is called for each new client connection
// but we only need one chat server instance per socketServer...
var serverList = {};
var createServer = function (clientConnection, socketServer) {
    var id = socketServer.id;
    var chatServer = serverList[id];
    if (chatServer == undefined) {
        chatServer = new ChatServer(clientConnection, socketServer).config();
        serverList[id] = chatServer;
    } else {
        console.log('>>>>>>>>>>>>>>>>>>>>>>found previous chatserver for ' + id);
    }
    // every clientConnection needs to register callbacks
    return chatServer.registerCallbacks(clientConnection);
};

//module.exports = my_socket_server;
module.exports = {chatserver: createServer};
