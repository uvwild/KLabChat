codeTest = {
    config: {
        server: 'localhost:2020'
    },
    nickName: 'person' + Date.now() % 10000,
    channel: 'defaultChannelInfo',
    client: null
};

jQuery(document).ready(init);


function init() {
    jQuery('#serverUrl').attr('value', codeTest.config.server);
    jQuery('#nickname').attr('value', codeTest.nickName);
    jQuery('#message').attr('value', "message" + +Date.now() % 10000);
    jQuery('#sendMsg').on(
        'click',
        function () {
            sendMsg();
        }
    );
    jQuery('#setNick').on(
        'click',
        setNick
    );
    jQuery('#joinChannel').on(
        'click',
        joinChannel
    );
    // TODO this needs logic to avoid creating a new web socket connections per connect CLICK!!!
    jQuery('#connect').on(
        'click',
        function (e) {
            if (typeof codeTest.client !== null) {
                if (codeTest.client != null && codeTest.client.close != undefined)
                    codeTest.client.close();
                delete codeTest.client;
            }
            codeTest.config.server = jQuery('#serverUrl').val();
            codeTest.client = setupSocket();
        }
    );
    jQuery('#disconnect').on(
        'click',
        disconnect
    );
    jQuery('#clearMessagePane').on(
        'click',
        clearMessagePane
    );
    drawMessage({author: 'system', channel: codeTest.channel, text: 'welcome to the test', timestamp: new Date().toLocaleTimeString()});
};


function joinChannel() {
    var channel = jQuery('#channel').val();
    codeTest.nickName = jQuery('#nickname').val();
    var data = {
        author: codeTest.nickName,
        channel: channel,
        timestamp: Date.now()
    };
    // register channel with server
    var sent = send2server('join', data);
    if (sent){
        jQuery('#messages').empty();
        drawMessage({
            author: 'system',
            channel: channel,
            text: 'Howdy, ' + codeTest.nickName + '! Welcome to channel ' + channel,
            timestamp: new Date(data.timestamp).toLocaleTimeString()
        });
    }
    return codeTest.channel;
};

function disconnect() {
    return codeTest.client.off();

};

function clearMessagePane() {
    jQuery('#messages').empty();
};

function setNick() {
    var nick = jQuery('#nickname').val();
    codeTest.nickName = nick;
    drawMessage({author: 'system', channel: codeTest.channel, text: 'greetings, ' + nick + '!', timestamp: new Date().toLocaleTimeString()});
    return codeTest.nickName;
};


// send message data from webform
function sendMsg() {
    var data = {
        author: jQuery('#nickname').val(),
        channel: jQuery('#channel').val(),
        text: jQuery('#message').val()
    };
    var sent = send2server('msg', data)
    if (sent) {
        drawMessage({author: 'YOU', channel: data.channel, text: data.text, timestamp: new Date().toLocaleTimeString()});
    }
    return sent;
};

// take data and send it to websocket... we add the msg timestamp here
function send2server(command, data) {
    if (codeTest.client == null) {
        jQuery('#wsstatus').text(new Date().toLocaleTimeString() + ' NOT CONNECTED to [' + codeTest.config.server + ']');
        clearMessagePane();
        return false;
    }
    var ret = codeTest.client.send({
            command: command,
            data: [
                {
                    author: data.author,
                    channel: data.channel,
                    timestamp: Date.now(),
                    text: data.text
                }
            ]
        }
    );
    return true; // the send doesnt return anything useful
};


function handleMessageFromServer(rawmsg) {
    var msg = rawmsg;
    if (typeof rawmsg !== 'undefined' && rawmsg != undefined)
        msg = rawmsg.action;
    if (typeof msg.command !== 'undefined' && typeof msg.data !== 'undefined') {
        console.log(msg.command);
        if (msg.command === 'messages') {       // other messages
            for (var n = 0; n < msg.data.length; n += 1) {
                drawMessage(msg.data[n]);
            }
        } else if (msg.command === 'msg') {    // my reply with the id
            jQuery('#wsstatus').text(new Date().toLocaleTimeString() + ' connection with ID: ' + rawmsg.id);
        }
    }
};


function drawMessage(data) {
    if (data.timestamp === parseInt(data.timestamp, 10))
        data.timestamp = new Date(data.timestamp).toLocaleTimeString();
    var msgString = '<span>{' + data.channel + '@' + data.timestamp + '} [' + data.author + '] ' + data.text + '</span><br/>';
    jQuery('#messages').append(msgString);
};


function setupSocket() {
    try {
        var testSocket = new Socket(codeTest.config.server, {autoReconnect: true});
        testSocket.on('reconnect', function (msg, e) {
            console.log('reconnected');
        });
        testSocket.on('close', function (e) {
            console.log('[close]');
            jQuery('#wsstatus').text(new Date().toLocaleTimeString() + ' connection closed');
        });
        testSocket.on('error', function (e) {
            console.log('[error]');
            jQuery('#wsstatus').text(new Date().toLocaleTimeString() + ' connection error');
        });
        testSocket.on('open', function (e) {
            jQuery('#wsstatus').text(new Date().toLocaleTimeString() + ' connection open');
            console.log('[open]');
            // dont add  duplicate message handlers !!!!
            if (testSocket.handler.message.length == 0) {
                testSocket.on('message', function (msg, e) {
                    console.log('[message]');
                    console.log(msg);
                    handleMessageFromServer(msg);
                });
            }
        });
        jQuery('#wsstatus').text(new Date().toLocaleTimeString() + ' connecting to [' + codeTest.config.server + ']');
    } catch (err) {
        jQuery('#wsstatus').text(new Date().toLocaleTimeString() + ' connection failed: ' + err);
    }
    return testSocket;
};

