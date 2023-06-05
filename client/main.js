import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
import { config } from "./config";
import "./main.css"
import { Syncronization } from "./player";

var localVideo;
var remoteVideo;
var firstPerson = false;
var socketCount = 0;
var socket;
var socketId;
var localStream;
var connections = [];
export var channels = {}

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
      video: {
        // width: {
        //     exact: 1024
        // },
        // height: {
        //     exact: 768
        // }
        resizeMode : "crop-and-scale"
    },
    video:true,
    audio: true,
    };


    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function(){
                socket = io.connect(config.host, {secure: false});
                socket.on('signal', gotMessageFromServer);    

                socket.on('connect', function(){

                    socketId = socket.id;
                    console.log("mysocket",socketId);   

                    socket.on('user-left', function(id){
                        
                        const index = connections.indexOf(id);
                        if (index > -1) { // only splice array when item is found
                            array.splice(index, 1); // 2nd parameter means remove one item only
                        }

                        delete channels[id]

                        var video = document.querySelector('[data-socket="'+ id +'"]');
                        var parentDiv = video.parentElement;
                        video.parentElement.parentElement.removeChild(parentDiv);
                    });


                    socket.on('user-joined', function(id, count, clients){
                        console.log("user-joined main", id,clients);
                        clients.forEach(function(socketListId) {
                            if(!connections[socketListId]){
                                connections[socketListId] = new RTCPeerConnection(peerConnectionConfig);
                                //Wait for their ice candidate       
                                connections[socketListId].onicecandidate = function(event){
                                    if(event.candidate != null) {
                                        socket.emit('signal', socketListId, JSON.stringify({'ice': event.candidate}));
                                    }
                                }




                                let remoteStream = new MediaStream()

                                connections[socketListId].ontrack = function(event) {
                                    event.streams.forEach(streams => {
                                        streams.getTracks().forEach((track) => {
                                          remoteStream.addTrack(track);
                                        });
                                      })
                                      event.streams[0].getTracks().forEach((track) => {
                                        remoteStream.addTrack(track);
                                      });
                                    // gotRemoteStream(event.streams[0], socketListId);
                                };
                                
                                if(socketListId != socketId){
                                    CreateVideoDom(id, remoteStream);
                                    var dc = connections[socketListId].createDataChannel("sendchannel");
                                    console.log("creating channel for ",socketListId,dc);
                                    
                                    dc.onopen = event => {console.log("channel open");}
                                    dc.onmessage = event=>{
                                        console.log("receving data from",socketListId,event);
                                        Syncronization.synconreceive(JSON.parse(event.data))
                                    };

                                    connections[socketListId].ondatachannel = event => {
                                        channels[socketListId] = event.channel
                                    }
                                }



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

function CreateVideoDom(id, remoteStream) {
    console.log("creating dom");
    let video = document.createElement('video');
    let div = document.createElement('div');

    video.setAttribute('data-socket', id);
    video.srcObject = remoteStream;

    video.autoplay = true;
    video.muted = false;
    video.playsinline = true;

    div.appendChild(video);
    document.querySelector('.videos').appendChild(div);
}

function getUserMediaSuccess(stream) {
    localStream = stream
    if ('srcObject' in localVideo) {
        localVideo.srcObject = stream;
      } else {
        localVideo.src = URL.createObjectURL(stream);
      }
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