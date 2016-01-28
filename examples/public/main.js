if (typeof console  != "undefined")
  if (typeof console.log != 'undefined')
    console.olog = console.log;
  else
    console.olog = function() {};

var jQuery = $;
console.log = function(message) {
  console.log(message);
  jQuery('#debugDiv').append('<p>' + message + '</p>');
};
console.error = console.debug = console.info =  console.log;


var testSocket = new Socket( 'localhost:2020', { autoReconnect: true });


testSocket.on('open', function ( e ) {

  console.log('[open]');


  testSocket.on('message', function ( msg, e ) {

    console.log('[message]');
    console.log(msg);
  });


  testSocket.on('reconnect', function ( msg, e ) {

    console.log('reconnected');
  });


  testSocket.on('close', function ( e ) {

    console.log('[close]');
  });


  testSocket.on('error', function ( e ) {

    console.log('[error]');
  });

});

