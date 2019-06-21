
var fs = require('fs');
var counterfolder=1;
var recordingPath = "./Recordings/";
var jsonfile="./";

if (!fs.existsSync(recordingPath))
{
    fs.mkdirSync(recordingPath);
}

var webcamCounter = 0;
var mediaDeviceInfos = []; //Stores the avaliable media devices
var mediaObjects = []; //A list of the created media recorders
var camnameid=0;

var currentvalue = "";

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

function startRecording(){

//Check input content
var fileCreationTimestamp = Date.now();
 var recordingName = "";
 var inputFolderElement = document.getElementById("foldername");
 if(inputFolderElement && inputFolderElement.value !== "")
 {
   recordingName = inputFolderElement.value + "_";
 }
 else {
   recordingName = "Recording_";
 }
  for(var i = 0; i !== mediaObjects.length; i++){
    var camname = document.getElementById('camname'+i);
    var camnamenew = "";
    if (camname && camname.value !== "")
    {
      camnamenew = camname.value;
    }
    else {
      camnamenew = "Default";
    }
    mediaObjects[i].outFile = recordingPath+recordingName+fileCreationTimestamp+'_'+webcamCounter+'_'+camnamenew;
    console.log('my came object'+mediaObjects[i]);
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
  videoConstraints.deviceId = mediaObject.value;
//newcont.deviceId;
  console.log("my device ids"+mediaObject.value);
  var bitDepth = 16;
  var sampleRate = 44100;
  var bitRate = sampleRate * bitDepth;
  navigator.mediaDevices.getUserMedia({ video: videoConstraints}).then(function(stream) {

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

var photomedias = [];
//var index_photomedia;

function Makingmedialist(){

  for (var i = 0; i !== mediaDeviceInfos.length; i++)
  {
    var deviceInfo = mediaDeviceInfos[i];

    if (deviceInfo.kind === 'videoinput') {
    //  photomedias = deviceInfo;
      photomedias.push(deviceInfo);
      //Create the element to display and record a video feed
      var videoRecorderDiv = document.createElement("DIV");
          videoRecorderDiv.classList.add("listing");
      var videoElement = document.createElement("VIDEO"); //The new Video element
        videoElement.classList.add("videos");
        videoElement.setAttribute("id", "videoscont");
        videoElement.muted = true; //Mute the video otherwise we get a feedback loop while recording if sound is on
      //Append the media options to the video container

        videoRecorderDiv.appendChild(videoElement);
        var camname = document.createElement("input");
        camname.classList.add("input-style");
        camname.setAttribute('id','camname'+camnameid)
        videoRecorderDiv.appendChild(camname);
        var mediaObject = {};
        mediaObject.videoElement = videoElement;
        mediaObject.recordingNmb = 0;
        mediaObject.value = deviceInfo.deviceId;
        mediaObjects.push(mediaObject);

      //Append the created elements to the document
        document.getElementById("mediaContainerDiv").appendChild(videoRecorderDiv);
        setupMediaRecorder(mediaObject);
        camnameid+=1;
    }
  }
}
var photocamera=0;
var photo = document.getElementById("clickphoto");
var imageCapture;
photo.onclick= photobutton;

var photoprocessing_check = document.getElementById('Photoprocessing');

function setupimages(photoobject)
{
var photomedia = {};
 photomedia.deviceId = photoobject.value;
 console.log("my photo ids"+photoobject.value);
 navigator.mediaDevices.getUserMedia({video: photomedia}).then(function(stream){
 var track = stream.getVideoTracks()[0];
 imageCapture = new ImageCapture(track);
 takePhoto();
 console.log('photo taken');
   });
   photocamera=0;
}

var imagediv= document.getElementById("imagediv");

var countli=1;
function takePhoto() {
  console.log("HAPPENS");
      imageCapture.takePhoto()
        .then(blob => {
          console.log('Taken Blob ' + blob.type + ', ' + blob.size + 'B');
          type: 'image/png';
          photocamera+=1;
          console.log('value of camera'+photocamera);
          var imgli = document.createElement("li");
          imagediv.setAttribute("style", "border-color: black ; border: 1px solid;");
          imagediv.appendChild(imgli);
          imgli.setAttribute("id", "imageli" + countli);
          var image = document.createElement("img");
          image.setAttribute('id','img' + countli)
          image.setAttribute('method', 'POST')
          document.getElementById("imageli" + countli).appendChild(image);
          image.src = URL.createObjectURL(blob);
          var reader = new window.FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function () {
          base64data = reader.result;
          let base64Image = base64data.split(';base64,').pop();
          var fileCreationTimestamp = Date.now();
          fs.writeFile('cam_'+photocamera+'_number'+'_image'+countli+'.png', base64Image, {encoding: 'base64'}, function(err) {
          console.log('File created');
           });
          }
          if(photoprocessing_check && photoprocessing_check.checked === true)
          {
          processphoto(countli);
          }
          countli +=1;
        })
        .catch(err => console.error('takePhoto() failed: ', err));
    }

var photo_interval= document.getElementById('photo_interval');
var photo_button_value;
var photo_take = '';

var interval_takephoto;

function photobutton(){
  photo_button_value = document.getElementById('clickphoto').value;
  if(photo_interval && photo_interval.value!=='' && photo_button_value === "Start" ){
    document.getElementById("clickphoto").value="Stop";
    document.getElementById("PhotoState").innerHTML="Stop Taking Photos";
    photo_take = photo_interval.value;
     interval_takephoto = setInterval(photosetting, photo_take);
    console.log("value of interval" + photo_take);
  }
  else if (photo_interval && photo_interval.value === '' && photo_button_value === "Start" ){
    photosetting();
  }

  else{
    document.getElementById("clickphoto").value="Start";
    document.getElementById("PhotoState").innerHTML="Take a Photo";
    clearInterval(interval_takephoto);
  }
}


function photosetting()
{
  for (var i = 0; i !== photomedias.length; i++)
  {
    var deviceInfo = photomedias[i];
      var photoobject = {};
      photoobject.value = deviceInfo.deviceId;
      setupimages(photoobject);

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
var nodeing;
var machine;
var mainscript;
var countscript=1;
function deleteChild() {
        var e = document.getElementById("machine");
        e.innerHTML = "";
  }

function processphoto(countli)
{

if(countscript==1)
{

machine = document.getElementById("machine");
mainscript = document.createElement("script");
machine.appendChild(mainscript);
var canvas = document.createElement("canvas");
canvas.setAttribute('id','canvas');
//canvas.setAttribute('style','width:300px; height:225px');
canvas.setAttribute('width','300');
canvas.setAttribute('height','225');
document.getElementById('imageprocc').appendChild(canvas);
//nodeing = document.createTextNode("const image = document.getElementById('img"+countli+"');cocoSsd.load().then(model => {model.detect(image).then(predictions => {console.log('Predictions: ', predictions);});});");
nodeing=document.createTextNode("var modelPromise;  var baseModel = 'mobilenet_v2'; modelPromise = cocoSsd.load(baseModel); const image = document.getElementById('img"+countli+"'); async function detection(){ const model = await modelPromise; console.time('predict1'); const result = await model.detect(image); console.timeEnd('predict1'); const c = document.getElementById('canvas');const context = c.getContext('2d');context.drawImage(image,0,0, 300, 225); context.font = '10px Arial'; console.log('number of detections: ', result.length); for (let i = 0; i < result.length; i++) {context.beginPath();context.rect(...result[i].bbox); context.lineWidth = 1; context.strokeStyle = 'green'; context.fillStyle = 'green'; context.stroke(); context.fillText(result[i].score.toFixed(1) + ' ' + result[i].class, result[i].bbox[0], result[i].bbox[1] > 10 ? result[i].bbox[1] - 5 : 10);}} detection();");
mainscript.appendChild(nodeing);
countscript+=1;
}
else if (countscript!=1) {
deleteChild();
machine = document.getElementById("machine");
mainscript = document.createElement("script");
machine.appendChild(mainscript);
var canvas = document.createElement("canvas");
canvas.setAttribute('id','canvas' + countscript);
document.getElementById('imageprocc').appendChild(canvas);
canvas.setAttribute('width','300');
canvas.setAttribute('height','225');
//nodeing = document.createTextNode(" const image" +countscript+" = document.getElementById('img"+countli+"'); cocoSsd.load().then(model => { model.detect(image"+countscript+").then(predictions => {console.log('Predictions: ', predictions);});}); ");
nodeing=document.createTextNode(" var modelPromise; var baseModel = 'mobilenet_v2';  modelPromise = cocoSsd.load(baseModel); const image" +countscript+" = document.getElementById('img"+countli+"'); async function detection(){const model = await modelPromise; console.time('predict" +countscript+"'); const result = await model.detect(image"+countscript+"); console.timeEnd('predict" +countscript+"'); const c = document.getElementById('canvas"+countscript+"'); const context = c.getContext('2d'); context.drawImage(image"+countscript+",0,0, 300, 225); context.font = '10px Arial'; console.log('number of detections: ', result.length); for (let i = 0; i < result.length; i++) {context.beginPath();context.rect(...result[i].bbox); context.lineWidth = 1; context.strokeStyle = 'green'; context.fillStyle = 'green'; context.stroke(); context.fillText(result[i].score.toFixed(1) + ' ' + result[i].class, result[i].bbox[0], result[i].bbox[1] > 10 ? result[i].bbox[1] - 5 : 10);}} detection();");

mainscript.appendChild(nodeing);
countscript+=1;
}
}



//WAMP
/*const wamp = require('./wamp.js');
config = {
  ip: "127.0.0.1",
  port: 8080,
  realm: "realm1"
};
wamp.restartWAMP(config, recordEventRecievedCallback);*/
