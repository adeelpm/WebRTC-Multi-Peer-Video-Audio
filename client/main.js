import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
import { config } from "./config";
import "./main.css"

var localVideo;
var remoteVideo;
var firstPerson = false;
var socketCount = 0;
var socket;
var socketId;
var localStream;
var connections = [];

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function pageReady() {

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    var constraints = {
        video: true,
        audio: false,
    };

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function(){
                socket = io.connect(config.host, {secure: false});
                socket.on('signal', gotMessageFromServer);    

                socket.on('connect', function(){

                    socketId = socket.id;

                    socket.on('user-left', function(id){
                        var video = document.querySelector('[data-socket="'+ id +'"]');
                        var parentDiv = video.parentElement;
                        video.parentElement.parentElement.removeChild(parentDiv);
                    });


                    socket.on('user-joined', function(id, count, clients){
                        clients.forEach(function(socketListId) {
                            if(!connections[socketListId]){
                                connections[socketListId] = new RTCPeerConnection(peerConnectionConfig);
                                //Wait for their ice candidate       
                                connections[socketListId].onicecandidate = function(event){
                                    if(event.candidate != null) {
                                        socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                                    }
                                }

                                connections[socketListId].ontrack = function(event) {
                                    gotRemoteStream(event.streams[0], socketListId);
                                  };

                                //Add the local video stream
                                const connection = connections[socketListId];
                                localStream.getTracks().forEach(track => {
                                    connection.addTrack(track, localStream);
                                });                                                              
                            }
                        });

                        //Create an offer to connect with your local description
                        
                        if(count >= 2){
                            connections[id].createOffer().then(function(description){
                                connections[id].setLocalDescription(description).then(function() {
                                    socket.emit('signal', id, JSON.stringify({'sdp': connections[id].localDescription}));
                                }).catch(e => console.log(e));        
                            });
                        }
                    });                    
                })       
        
            }); 
    } else {
        alert('Your browser does not support getUserMedia API');
    } 
}

function getUserMediaSuccess(stream) {
    localStream = stream

    if ('srcObject' in localVideo) {
        localVideo.srcObject = stream;
      } else {
        localVideo.src = URL.createObjectURL(stream);
      }
}

function gotRemoteStream(event, id) {

    var videos = document.querySelectorAll('video'),
        video  = document.createElement('video'),
        div    = document.createElement('div')

    video.setAttribute('data-socket', id);
    if ('srcObject' in video) {
        video.srcObject = event;
      } else {
        video.src = URL.createObjectURL(event);
      }
    video.autoplay    = true; 
    video.muted       = true;
    video.playsinline = true;
    
    div.appendChild(video);      
    document.querySelector('.videos').appendChild(div);      
}

function gotMessageFromServer(fromId, message) {

    //Parse the incoming signal
    var signal = JSON.parse(message)

    //Make sure it's not coming from yourself
    if(fromId != socketId) {

        if(signal.sdp){            
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {                
                if(signal.sdp.type == 'offer') {
                    connections[fromId].createAnswer().then(function(description){
                        connections[fromId].setLocalDescription(description).then(function() {
                            socket.emit('signal', fromId, JSON.stringify({'sdp': connections[fromId].localDescription}));
                        }).catch(e => console.log(e));        
                    }).catch(e => console.log(e));
                }
            }).catch(e => console.log(e));
        }
    
        if(signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }                
    }
}

pageReady()