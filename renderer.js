// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var fs = require('fs')
var counterfolder=1;
var recordingPath = "./Recordings/";
var jsonfile="./"
//make and check directory
if (!fs.existsSync(recordingPath))
{
    fs.mkdirSync(recordingPath);
}

var webcamCounter = 0;
var mediaDeviceInfos = []; //Stores the avaliable media devices
var mediaObjects = []; //A list of the created media recorders
var selectedcam = 1;

var imageselector = 0 ;

  var currentvalue = "";
//to record streaming function and change button state
function recordingbutton(){
  currentvalue = document.getElementById('recordBtn').value;
  if(currentvalue === "Start"){
    document.getElementById("recordBtn").value="Stop";
    document.getElementById("State").innerHTML="Stop";
    document.getElementById("recordBtn").className = "stoprecordBtn";
    startRecording();
  }
  else{
    document.getElementById("recordBtn").value="Start";
    document.getElementById("State").innerHTML="Start";
    document.getElementById("recordBtn").className = "startrecordBtn";
    stopRecording();
  }
}

var recordbutton = document.getElementById("recordBtn");
recordbutton.onclick= recordingbutton ;


//recorde stream of all camera
function startRecording(){

//Check input content
var fileCreationTimestamp = Date.now();
 var recordingName = "";
 var inputFolderElement = document.getElementById("foldername");
 if(inputFolderElement && inputFolderElement.value !== "")
 {
   recordingName = inputFolderElement.value + "_";
 }
    
  for(var i = 0; i !== mediaObjects.length; i++){
    mediaObjects[i].outFile = recordingPath+fileCreationTimestamp+'_'+recordingName+"Recording_Webcam_"+webcamCounter;
    console.log(mediaObjects[i]);
    var mediaRecorder = mediaObjects[i].recorder;
    mediaRecorder.start(1000);
    webcamCounter += 1; //Increment the global media recorder counter
    var  dataset= {
      table:[]
    };

    dataset.table.push({fileCreationTimestamp:fileCreationTimestamp, webcamCounter:webcamCounter});
    var json = JSON.stringify(dataset);
    fs.writeFileSync(recordingName+"Recording" +'.json', json);
  }

  console.log("Recordings started");

}

function stopRecording(){
  for(var i = 0; i !== mediaObjects.length; i++){
    var mediaRecorder = mediaObjects[i].recorder;
    mediaRecorder.stop();
  }
webcamCounter=0;

}

//check information of devices attached with system
function gotDevices(deviceInfos) {
  mediaDeviceInfos  = deviceInfos;
  Makingmedialist();

}
navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(
  function(err) {
     console.log('The following getUserMedia error occured: ' + err);
   });

//Sets up the preview and prepares the recording of the media object
function setupMediaRecorder(mediaObject){
  var videoConstraints = {};
  //Setup the video constraints
  videoConstraints.deviceId = mediaObject.value;//newcont.deviceId;
  console.log("my device ids"+mediaObject.value);
  var bitDepth = 16;
  var sampleRate = 44100;
  var bitRate = sampleRate * bitDepth;
  navigator.mediaDevices.getUserMedia(
    { video: videoConstraints}).then(function(stream) {

      const blobs = [];

      const blob_reader = new FileReader();

      var storage_stream = null;
      var first = true;

      blob_reader.addEventListener("load", function(ev) {
          if(first){
            storage_stream = require("fs").createWriteStream(mediaObject.outFile+"_rec"+mediaObject.recordingNmb+".webm");
            mediaObject.stream = storage_stream;
            first = false;
          }

          storage_stream.write(Buffer.from(ev.currentTarget.result));
          if(blobs.length) {
              ev.currentTarget.readAsArrayBuffer(blobs.shift());
          }
      });

      var types = ["video/webm",
             "audio/webm",
             "video/webm\;codecs=vp8", //Seems to work well, can fix the header in a second
             "video/webm\;codecs=daala", //Not supported (My machine)
             "video/webm\;codecs=h264", //Works, but can't fix header without transcoding the whole video (Takes a long time)
             "audio/webm\;codecs=opus",
             "video/mpeg"]; //Not supported (My machine)

      for (var i in types) {
        console.log( "Is " + types[i] + " supported? " + (MediaRecorder.isTypeSupported(types[i]) ? "Maybe!" : "Nope :("));
      }

      const codec = "video/webm\;codecs=vp8";
      const recorder = new MediaRecorder(stream, {
        mimeType: codec,
      });
      mediaObject.recorder = recorder;
      recorder.addEventListener("dataavailable", function(ev) {
          if(blob_reader.readyState != 1) {
            console.log(ev.data);
            blob_reader.readAsArrayBuffer(ev.data);
          } else {
            blobs.push(ev.data);
          }
      });

      recorder.addEventListener("stop", mediaRecorderStopped.bind(event, mediaObject));

      //Stream preview
     mediaObject.videoElement.srcObject = stream;
     mediaObject.videoElement.load();
     mediaObject.videoElement.play();
  //  mediaObject.deviceId=stream;
  });
}

var stoppedRecordings = 0;
//called when the attached media recorder stops recording
function mediaRecorderStopped(mediaObject, ev){
  console.log("Recording stopped");

  stoppedRecordings += 1;
  //All recordings have been stopped
  if(stoppedRecordings === mediaObjects.length){
    allRecordersStopped();
    stoppedRecordings = 0;
  }
}

var transcodingsCompleted = 0;
function allRecordersStopped(){
  console.log("All recordings stopped, beginning transcoding of recordings");
  //We use FFMPEG to fix the video header as it is not saved correctly by th media recorder
  var ffmpeg = require('fluent-ffmpeg');
  var command = ffmpeg();

  //iterate over all the media recorder objects, transcode, save and delete old file
  for(var i = 0; i !== mediaObjects.length; i++){
    var mediaObject = mediaObjects[i];
    var savePath = mediaObject.outFile+"_rec"+mediaObject.recordingNmb+"_T.webm"; //.replace(".webm", "T.webm");

    ffmpeg(mediaObject.outFile+"_rec"+mediaObject.recordingNmb+".webm")
    .inputOptions('-sn')
    .outputOptions('-c copy')
    .format('webm')
    .save(savePath)
    .on('end', function(stdout, stderr)
    {
      console.log('Transcoding succeeded !');
      transcodingsCompleted+=1;
      if(transcodingsCompleted === mediaObjects.length){
        transcodingsCompleted = 0;
        //All the transcodings are finished so let's cleanup the tmp video files
        cleanTmpFiles();
      }
    });
  }
}

function cleanTmpFiles(){
  //Reset the media objects in case we want to start a new recording
  for(var i = 0; i !== mediaObjects.length; i++){
  mediaObjects[i].videoElement.pause();
    mediaObjects[i].stream.end();

    fs.unlink(mediaObjects[i].outFile+"_rec"+mediaObjects[i].recordingNmb+".webm", (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    mediaObjects[i].recordingNmb += 1;
    setupMediaRecorder(mediaObjects[i]);
  }
}

function Makingmedialist(){

  for (var i = 0; i !== mediaDeviceInfos.length; i++)
  {
    var deviceInfo = mediaDeviceInfos[i];

    if (deviceInfo.kind === 'videoinput') {
      //Create the element to display and record a video feed
      var videoRecorderDiv = document.createElement("DIV");
          videoRecorderDiv.classList.add("listing");
      var videoElement = document.createElement("VIDEO"); //The new Video element
        videoElement.classList.add("videos");
        videoElement.setAttribute("id", "videoscont");
        videoElement.muted = true; //Mute the video otherwise we get a feedback loop while recording if sound is on
      //Append the media options to the video container

        videoRecorderDiv.appendChild(videoElement);
        var mediaObject = {};
        mediaObject.videoElement = videoElement;
        mediaObject.recordingNmb = 0;
        mediaObject.value = deviceInfo.deviceId;
        mediaObjects.push(mediaObject);

      //Append the created elements to the document
        document.getElementById("mediaContainerDiv").appendChild(videoRecorderDiv);
        setupMediaRecorder(mediaObject);
    }
  }
}

var photo = document.getElementById("clickphoto");
var imageCapture;
photo.onclick= photosetting;

//set available streaming dynamically to capture image
function setupimages(photoobject)
{
  var photomedia = {};
  photomedia.deviceId = photoobject.value;
    console.log("my photo ids"+photoobject.value);
  navigator.mediaDevices.getUserMedia({video: photomedia}).then(function(stream){
 photoobject.stream =   stream ;
 console.log(photoobject.stream);
 const track = stream.getVideoTracks()[0];
 imageCapture = new ImageCapture(track);
 takePhoto();
   });
}

//creat image in blob and change it to img source with URL
function takePhoto() {
  console.log("HAPPENS");
      imageCapture.takePhoto()
        .then(blob => {
          console.log('Photo taken: ' + blob.type + ', ' + blob.size + 'B');
          var image = document.createElement("img");
          document.getElementById("imagediv").appendChild(image);
          image.src = URL.createObjectURL(blob);
        })
        .catch(err => console.error('takePhoto() failed: ', err));
    }
// get all available video streaming devices to capture image
function photosetting()
{
  for (var i = 0; i !== mediaDeviceInfos.length; i++)
  {
  var deviceInfo = mediaDeviceInfos[i];

    if (deviceInfo.kind === 'videoinput')
    {
      var photoobject = {};
      photoobject.value = deviceInfo.deviceId;
      setupimages(photoobject);
    }
  }
}

function recordEventRecievedCallback(args){
  console.log(args);
  if(args[0] === "Recording"){
    startRecording();
  }
  else if(args[0] === "Stopped Recording")
  {
    stopRecording();
  }
}

//WAMP
const wamp = require('./wamp.js');
config = {
  ip: "127.0.0.1",
  port: 8080,
  realm: "realm1"
};
wamp.restartWAMP(config, recordEventRecievedCallback);
