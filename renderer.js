
var fs = require('fs');
var counterfolder=1;
var recordingPath = "./Recordings/";
var jsonfile="./";

//Create and check recording folder to save videos
if (!fs.existsSync(recordingPath))
{
    fs.mkdirSync(recordingPath);
}

function gotDevices(deviceInfos) {
  mediaDeviceInfos  = deviceInfos;
  Makingmedialist();

}
navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(
  function(err) {
     console.log('The following getUserMedia error occured: ' + err);
   });

//Stores the avaliable media devices
var mediaDeviceInfos = [];

//Video functions Variables
var webcamCounter = 0;
var mediaObjects = []; //A list of the created media recorders
var camnameid=0;
var transcodingsCompleted = 0;
var stoppedRecordings = 0;

//Photo funcitons variables
var images = [];
var countli=0;
var photo_button_value;
var photo_take = '';
var imagul;
var interval_takephoto;
var countul=1;

// Machine learning Photo process variables
var nodeing;
var machine;
var mainscript;
var countscript=1;

//HTML call variables
var photoprocessing_check = document.getElementById('Photoprocessing'); // Checkbox for photo processing
var photo_interval= document.getElementById('photo_interval'); // image inteval input field
var imagediv= document.getElementById("imagediv"); // image list div
var recordbutton = document.getElementById("recordBtn"); // Record button call from HTMl
var currentvalue = ""; // Value of record button
var photo = document.getElementById("clickphoto");

//onclick functions call
photo.onclick= photobutton;
recordbutton.onclick= recordingbutton ;

//create stream and recorder function
function createStream(mediaObject)
{

   navigator.mediaDevices.getUserMedia({ video: mediaObject}).then(function(stream) {
      //Stream preview
      mediaObject.mediaStream = stream;
      mediaObject.preview.srcObject = stream;
      mediaObject.preview.load();
      mediaObject.preview.play();
      const track = mediaObject.mediaStream.getVideoTracks()[0];
      mediaObject.imageCapture = new ImageCapture(track);
      createMediaRecorders(mediaObject);

  });
}

function createMediaRecorders (mediaObject)
{

  const blobs = [];
  const blob_reader = new FileReader();
  var storage_stream = null;
  var first = true;
  blob_reader.addEventListener("load", function(ev) {
       if(first){
         storage_stream = require("fs").createWriteStream(mediaObject.videoFileName+"_rec"+mediaObject.videoRecordingCount+".webm");
         mediaObject.videoWriteStream = storage_stream;
         first = false;
       }
       storage_stream.write(Buffer.from(ev.currentTarget.result));
       if(blobs.length) {
           ev.currentTarget.readAsArrayBuffer(blobs.shift());
       }
  });

  var videoFormat = ["video/webm",
         "audio/webm",
         "video/webm\;codecs=vp8", //Seems to work well, can fix the header in a second
         "video/webm\;codecs=daala", //Not supported (My machine)
         "video/webm\;codecs=h264", //Works, but can't fix header without transcoding the whole video (Takes a long time)
         "audio/webm\;codecs=opus",
         "video/mpeg"]; //Not supported (My machine)

  for (var i in videoFormat) {
    console.log( "Is " + videoFormat[i] + " supported? " + (MediaRecorder.isTypeSupported(videoFormat[i]) ? "Maybe!" : "Nope :("));
  }
   const codec = "video/webm\;codecs=vp8";
   const recorder = new MediaRecorder(mediaObject.mediaStream, {
     mimeType: codec,
   });
   mediaObject.mediaRecorder = recorder;

   recorder.addEventListener("dataavailable", function(ev) {
       if(blob_reader.readyState != 1) {
         console.log(ev.data);
         blob_reader.readAsArrayBuffer(ev.data);
       } else {
         blobs.push(ev.data);
       }
   });

   recorder.addEventListener("stop", mediaRecorderStopped.bind(event, mediaObject));

}

// create media object and HTML elements. Also send media object to mediaObjects list
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
        var camname = document.createElement("input");
        camname.classList.add("input-style");
        camname.setAttribute('id','camname'+camnameid)
        videoRecorderDiv.appendChild(camname);
        var mediaObject = {};
      //  mediaObject
        mediaObject.preview = videoElement;
        mediaObject.videoRecordingCount = 0;
        mediaObject.deviceId = deviceInfo.deviceId;
        mediaObjects.push(mediaObject);

      //Append the created elements to the document
        document.getElementById("mediaContainerDiv").appendChild(videoRecorderDiv);
      //  setupMediaRecorder(mediaObject);
       createStream(mediaObject);
        camnameid+=1;
    }
  }
}

// Recording button changes and setup
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

//Recording vide and saving video file together
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
    mediaObjects[i].videoFileName = recordingPath+recordingName+fileCreationTimestamp+'_'+webcamCounter+'_'+camnamenew;
    console.log('my came object'+mediaObjects[i]);
    var mediaRecorder = mediaObjects[i].mediaRecorder;
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

//Stop recording function calls after click on stop button
function stopRecording(){
  for(var i = 0; i !== mediaObjects.length; i++){
    var mediaRecorder = mediaObjects[i].mediaRecorder;
    mediaRecorder.stop();
  }
webcamCounter=0;
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

// Stop all recordings and use ffmpeg to recreate file output
function allRecordersStopped(){
  console.log("All recordings stopped, beginning transcoding of recordings");
  //We use FFMPEG to fix the video header as it is not saved correctly by th media recorder
  var ffmpeg = require('fluent-ffmpeg');
  var command = ffmpeg();

  //iterate over all the media recorder objects, transcode, save and delete old file
  for(var i = 0; i !== mediaObjects.length; i++){
    var mediaObject = mediaObjects[i];
    var savePath = mediaObject.videoFileName+"_rec"+mediaObject.videoRecordingCount+"_T.webm"; //.replace(".webm", "T.webm");

    ffmpeg(mediaObject.videoFileName+"_rec"+mediaObject.videoRecordingCount+".webm")
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

//clean all temporary files after stop recording if we want new recording
function cleanTmpFiles(){
  for(var i = 0; i !== mediaObjects.length; i++){
    mediaObjects[i].preview.pause();
    mediaObjects[i].videoWriteStream.end();
    fs.unlink(mediaObjects[i].videoFileName+"_rec"+mediaObjects[i].videoRecordingCount+".webm", (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    mediaObjects[i].videoRecordingCount += 1;
    createStream(mediaObjects[i]);
  }}

//Photo button function to call takephoto function and change its state according to condition
function photobutton(){

    photo_button_value = document.getElementById('clickphoto').value;
    imagul = document.createElement('ul');
    imagul.setAttribute("style", "border-color: black ; border: 1px solid;");
    imagediv.appendChild(imagul);
    imagul.setAttribute('class', "images");
    imagul.setAttribute('id', 'ulnumber'+ countul);
    var theFirstChild = imagediv.firstChild;
    imagediv.insertBefore(imagul, theFirstChild);

    if(photo_interval && photo_interval.value!=='' && photo_button_value === "Start" ){
      document.getElementById("clickphoto").value="Stop";
      document.getElementById("PhotoState").innerHTML="Stop Taking Photos";
      photo_take = photo_interval.value;
       interval_takephoto = setInterval(takePhoto, photo_take);
      console.log("value of interval" + photo_take);
      countul+=1;
    }
    else if (photo_interval && photo_interval.value === '' && photo_button_value === "Start" ){
      takePhoto();
      countul+=1;
    }

    else{
      document.getElementById("clickphoto").value="Start";
      document.getElementById("PhotoState").innerHTML="Take a Photo";
      clearInterval(interval_takephoto);
    }

  }

//Take a photo function to create images from camera object list imageCaptureObjects and save it in a folder
function takePhoto() {
  for(var i =0; i!== mediaObjects.length;i++)
  {
      mediaObjects[i].imageCapture.takePhoto(). then( function (blob) 
        {
          console.log('Taken Blob ' + blob.type + ', ' + blob.size + 'B');
          type: 'image/png';

          var imagul2= document.getElementById('ulnumber'+ countul);
          var imgli = document.createElement('li');
          console.log('value of li start' + countli);
          imgli.setAttribute("id", "imageli" + countli);
          imagul.appendChild(imgli);
          var image = document.createElement("img");
          image.setAttribute('id','img' + countli)
          image.setAttribute('method', 'POST')
          document.getElementById("imageli" + countli).appendChild(image);
          image.src = URL.createObjectURL(blob);
          var reader = new window.FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function () {
          console.log('value of li mid value:' + countli);
          base64data = reader.result;
          let base64Image = base64data.split(';base64,').pop();
           var fileCreationTimestamp = Date.now();
          var recordingName = "";
          var inputFolderElement = document.getElementById("foldername");

          if(inputFolderElement && inputFolderElement.value !== "")
          {
            recordingName = inputFolderElement.value + "_";
          }
          else {
            recordingName = "Default_Dataset_";
          }
          console.log('value of li second last' + countli);
          fs.writeFile(fileCreationTimestamp+'_'+recordingName +'_image_'+countli+'.png', base64Image, {encoding: 'base64'}, function(err) {
          console.log('File created');
           });

          /* if(photoprocessing_check && photoprocessing_check.checked === true)
           {
           processphoto(countli);
           }
          */
          countli +=1;
          }

        }).catch(err => console.error('takePhoto() failed: ', err));
    }
}

// process photos by sending them to machine learning API cocoSsd model in case if checkbox is checked
//code is created in HTML
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

//Delete code from HTMl after processing the photos and desplaying on HTMl
function deleteChild() {
        var e = document.getElementById("machine");
        e.innerHTML = "";
  }

//WAMP
/*const wamp = require('./wamp.js');
config = {
  ip: "127.0.0.1",
  port: 8080,
  realm: "realm1"
};
wamp.restartWAMP(config, recordEventRecievedCallback);*/
