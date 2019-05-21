try {
   // for Node.js
   var autobahn = require('autobahn');
} catch (e) {
  console.log("Error importing autobahn (WAMP)" + e);
   // for browsers (where AutobahnJS is available globally)
}

//var dat = [dat0, dat1, dat2];
var connection = null;
var glob_session = null;
var WebEntryTopic = "Synopticon.WebEntry";

function startWAMP(config, recordEventRecievedCallback) {
  if(connection) {
    try {
      connection.close();
    }
    catch (err) {
      console.log("error when close connection", err);
    }

  }
  connection = new autobahn.Connection({url: 'ws://'+config.ip+':'+config.port+'/ws', realm: config.realm});
  connection.onopen = function (session) {

    // 1) subscribe to a topic
    session.subscribe('Synopticon.RecordingEvents', recordEventRecievedCallback);

     // 2) publish an event
     glob_session = session;
     console.log("connected to router");
  };
  connection.open();
}


module.exports = {
  restartWAMP(config, recordEventRecievedCallback) {
    startWAMP(config, recordEventRecievedCallback);
  }
};
