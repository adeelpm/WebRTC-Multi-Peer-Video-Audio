import { channels } from "./main.js";
import "./player.css"
var extensionMode;
const popupWindow = !0,
    video = document.getElementById("video"),
    playerPanel = document.getElementById("player");
let fileList = [];
void 0 === document.exitFullscreen && (document.exitFullscreen = document.webkitExitFullscreen);
function getFullscreenElement() {
    return void 0 === document.fullscreenElement ? document.webkitFullscreenElement : document.fullscreenElement
}
void 0 === playerPanel.requestFullscreen && (playerPanel.requestFullscreen = playerPanel.webkitRequestFullscreen);
const info = document.getElementById("info")
const errorInfo = document.getElementById("error-info")
const ltInfo = document.getElementById("lt-info")
const rtInfo = document.getElementById("rt-info")
const controlsPanel = document.getElementById("controls")
const progress = document.getElementById("progress")
const volume = document.getElementById("volume")
const [leftTime, rightTime] = document.querySelectorAll("#progress-controls .time")
const [openFileBtn, repeatBtn, addFileBtn, volumeBtn] = document.querySelectorAll("#buttons-left .btn")
const [previousBtn, rewindBtn, playBtn, forwardBtn, nextBtn] = document.querySelectorAll("#buttons-center .btn")
const [settingsBtn, fullscreenBtn] = document.querySelectorAll("#buttons-right .btn");
let remainingTimeMode = !1;
const filesContainer = document.getElementById("files-container")
const filelistContainer = document.getElementById("filelist")
const seekStepInput = document.getElementById("seekStep")
const seekLongStepInput = document.getElementById("seekLongStep")
const volumeStepInput = document.getElementById("volumeStep")
const speedStepInput = document.getElementById("speedStep")
const screenshotFormatInput = document.getElementById("screenshotFormat");
var settings = {
    seekStep: 5,
    seekLongStep: 30,
    volumeStep: 10,
    speedStep: .25,
    timeFormatHour12: !0,
    timeFormatSecond: !1,
    screenshotFormat: "jpg"
};
class Utils {
    static delay(a, b) {
        let c = 0;
        return function (...d) {
            clearTimeout(c);
            c = setTimeout(a.bind(this, ...d), b)
        }
    }
    static showInfo(a) {
        info.textContent = a;
        info.classList.remove("d-none");
        Utils.delayHideInfo()
    }
    static hideInfo() {
        info.classList.add("d-none")
    }
    static showError(a) {
        errorInfo.textContent = a;
        errorInfo.classList.remove("d-none");
        Utils.delayHideError()
    }
    static hideError() {
        errorInfo.classList.add("d-none")
    }
    static formatTime(a) {
        var b = Math.round(a);
        a = Math.floor(b / 60);
        b %= 60;
        return `${10 > a ? "0" + a : a
            }:${10 > b ? "0" + b : b
            }`
    }
    static screenshot() {
        if (!(2 > video.readyState)) {
            Utils.canvas || (Utils.canvas = document.createElement("canvas"));
            Utils.file || (Utils.file = document.createElement("a"));
            var a = Utils.canvas,
                b = Utils.file;
            a.width = video.videoWidth;
            a.height = video.videoHeight;
            a.getContext("2d").drawImage(video, 0, 0, a.width, a.height);
            settings && "png" == settings.screenshotFormat ? (b.download =
                `screenshot-${video.currentTime.toFixed(3)
                }.png`, b.href = a.toDataURL("image/png")) : (b.download =
                    `screenshot-${video.currentTime.toFixed(3)
                    }.jpg`, b.href = a.toDataURL("image/jpeg", .98));
            b.click()
        }
    }
} 
Utils.delayHideInfo = Utils.delay(Utils.hideInfo, 1500);
Utils.delayHideError = Utils.delay(Utils.hideError, 1500);
class Clock {
    static init() {
        let a = {
            hourCycle: settings.timeFormatHour12 ? "h12" : "h23",
            hour: "2-digit",
            minute: "2-digit"
        };
        settings.timeFormatSecond && (a.second = "2-digit");
        Clock.ClockFormat = new Intl.DateTimeFormat("en-GB", a)
    }
    static toggleClockTime() {
        rtInfo.classList.contains("d-none") ? (Clock.updateClockTime(), rtInfo.classList.remove("d-none"), Clock.clockTimer = setInterval(Clock.updateClockTime, 1E3)) : (rtInfo.classList.add("d-none"), clearInterval(Clock.clockTimer))
    }
    static updateClockTime() {
        rtInfo.textContent = Clock.ClockFormat.format(new Date)
    }
}
class Player {
    static init() { }
    static async loadFile(a) {
        document.title = a.name;
        Player.objectURL && URL.revokeObjectURL(Player.objectURL);
        Player.objectURL = URL.createObjectURL(a);
        video.src = Player.objectURL;
        if (void 0 === a.canPlay)
            try {
                await video.play(),
                    a.canPlay = !0
            }
            catch (b) {
                a.canPlay = !1,
                    Player.stop(),
                    "NotSupportedError" == b.name ? Utils.showError(Messages.cannotSupportFormat) : "NotAllowedError" == b.name ? (alert(Messages.notAllowedError), a.canPlay = void 0) : Utils.showError(Messages.error)
            } else
            !0 === a.canPlay && Player.play();
        Controls.onVideoChange();
        FileManager.updatePlaylistIndicator();
        !1 === a.canPlay && setTimeout(Controls.onVideoEnd, 1E3)
    }
    static stop() {
        video.removeAttribute("src");
        video.load()
    }
    static async play() {
        if (video.src)
            try {
                await video.play()
            }
            catch (a) {
                Utils.showError(Messages.error)
            }
    }
    static playNext(a = !0) {
        return (a = FileManager.getNextFile(!0, a)) ? (Player.loadFile(a), !0) : !1
    }
    static playPrevious() {
        let a = FileManager.getNextFile(!1);
        return a ? (Player.loadFile(a), !0) : !1
    }
    static togglePlay() {
        video.paused || video.ended ? Player.play() : video.pause()
    }
    static toggleMute() {
        video.muted = !video.muted;
        Utils.showInfo(video.muted ? Messages.muted : Messages.unmuted)
    }
    static seek(a, b) {
        !video.src || !Number.isFinite(video.duration) || 1 > b && !video.paused || (video.currentTime = a ? Math.min(video.currentTime + b, video.duration) : Math.max(video.currentTime - b, 0), 1 <= b && (a =
            `${Utils.formatTime(video.currentTime)
            } / ${Utils.formatTime(video.duration)
            }`, Utils.showInfo(a)))
    }
    static volume(a, b) {
        let c = Math.round(100 * video.volume);
        c = a ? Math.min(c + b, 100) : Math.max(c - b, 0);
        video.volume = c / 100;
        Utils.showInfo(Messages.volumeIs + c)
    }
    static speed(a, b) {
        a = a ? parseFloat((video.playbackRate + b).toFixed(2)) : parseFloat((video.playbackRate - b).toFixed(2));
        .25 <= a && 5 >= a && (video.playbackRate = a);
        Utils.showInfo(Messages.speedIs + video.playbackRate)
    }
    static resetSpeed() {
        video.playbackRate = 1;
        Utils.showInfo(Messages.speedIs + "1")
    }
    static toggleVideoTime() {
        video.src && Number.isFinite(video.duration) && (ltInfo.classList.contains("d-none") ? (Player.updateVideoTime(), ltInfo.classList.remove("d-none"), Player.timeTimer = setInterval(Player.updateVideoTime, 1E3)) : (ltInfo.classList.add("d-none"), clearInterval(Player.timeTimer)))
    }
    static updateVideoTime() {
        let a = `${Utils.formatTime(video.currentTime)
            } / ${Utils.formatTime(video.duration)
            }  [-${Utils.formatTime(video.duration - video.currentTime)
            }]`;
        ltInfo.textContent = a
    }
}
var mouseMoveTimer = 0,
    clickDblclickTimer = 0;

export class Syncronization{

    static init(){
        video.addEventListener("pause", Syncronization.onPauseSync);
        video.addEventListener("play", Syncronization.onPlaySync);
    }

    static send(data){
        Object.entries(channels).forEach(entry => {            
            const [socket, channel] = entry;
            if(channel.readyState == "open"){
                console.log("sending: ",data,"to ",socket)
                channel.send(JSON.stringify(data))
            }
        } )
    }

    // syncs player on receiving data
    static async synconreceive(data){
        
        if(data.play){
            video.removeEventListener("play",Syncronization.onPlaySync)
            video.currentTime = data.time
            await Player.play()

            video.addEventListener("play", Syncronization.onPlaySync);
        }
        if(data.pause){
            video.removeEventListener("pause",Syncronization.onPauseSync)
            await video.pause()
            video.addEventListener("pause", Syncronization.onPauseSync);
        }
    }

    static onPauseSync(){
        Syncronization.send({pause:true})

    }
    static onPlaySync(){
        video.currentTime = Math.round(video.currentTime)
        Syncronization.send({play:true,time:Math.round(video.currentTime)})
    }
}

class Controls {
    static init() {
        document.body.addEventListener("keydown", Controls.keyboardListener);
        "onfullscreenchange" in Document.prototype ? document.addEventListener("fullscreenchange", Controls.onFullscreenChange) : document.addEventListener("webkitfullscreenchange", Controls.onFullscreenChange);
        Controls.progressDragging = !1;
        video.addEventListener("loadedmetadata", Controls.onLoadedmetadata);
        video.addEventListener("timeupdate", Controls.updateTime);
        video.addEventListener("volumechange", Controls.onVolumeChange);
        video.addEventListener("ended", Controls.onVideoEnd);
        video.addEventListener("pause", Controls.onPause);
        video.addEventListener("play", Controls.onPlay);
        progress.addEventListener("change", Controls.onProgressChange);
        progress.addEventListener("input", Controls.onProgressInput);
        rightTime.addEventListener("click", Controls.changeTimeMode);
        controlsPanel.addEventListener("click", a => a.stopPropagation());
        playerPanel.addEventListener("click", Controls.onPlayerClick);
        openFileBtn.addEventListener("click", FileManager.openFiles);
        volumeBtn.addEventListener("click", a => Player.toggleMute());
        volume.addEventListener("input", Controls.onVolumeInput);
        volume.addEventListener("change", a => volume.blur());
        previousBtn.addEventListener("click", Player.playPrevious);
        rewindBtn.addEventListener("click", a => Player.seek(!1, settings.seekStep));
        playBtn.addEventListener("click", Player.togglePlay);
        forwardBtn.addEventListener("click", a => Player.seek(!0, settings.seekStep));
        nextBtn.addEventListener("click", Player.playNext);
        fullscreenBtn.addEventListener("click", WindowManager.toggleFullscreen);
        "mediaSession" in navigator && (navigator.mediaSession.setActionHandler("previoustrack", Player.playPrevious), navigator.mediaSession.setActionHandler("nexttrack", Player.playNext), navigator.mediaSession.setActionHandler("seekbackward", () => Player.seek(!1, settings.seekStep)), navigator.mediaSession.setActionHandler("seekforward", () => Player.seek(!0, settings.seekStep)));
        document.body.addEventListener("contextmenu", a => a.preventDefault());
        Controls.hidden = !0;
        filesContainer.addEventListener("mousemove", Controls.onMouseMove);
        document.getElementById("settings").addEventListener("mousemove", Controls.onMouseMove);
        controlsPanel.addEventListener("mousemove", Controls.onMouseMove);
        playerPanel.addEventListener("mousemove", Controls.onMouseMove)
    }
    static changeTimeMode() {
        remainingTimeMode = !remainingTimeMode;
        Controls.updateTime();
        Settings.saveRemainingTimeMode(remainingTimeMode)
    }
    static updateTime() {
        Controls.hidden || 0 === video.readyState || (Controls.progressDragging ? (leftTime.textContent = Utils.formatTime(progress.value), remainingTimeMode && (rightTime.textContent = "-" + Utils.formatTime(video.duration - progress.value))) : (progress.value = video.currentTime, leftTime.textContent = Utils.formatTime(video.currentTime), rightTime.textContent = remainingTimeMode ? "-" + Utils.formatTime(video.duration - video.currentTime) : Utils.formatTime(video.duration)))
    }
    static onLoadedmetadata() {
        getFullscreenElement() || WindowManager.scaleSize(1);
        progress.max = video.duration;
        Controls.updateTime()
    }
    static onPause() {
        playBtn.src = "assets/play_arrow.svg"        
    }
    static onPlay() {
        playBtn.src = "assets/pause.svg"
    }
    static onFullscreenChange() {
        getFullscreenElement() ? fullscreenBtn.src = "assets/fullscreen_exit.svg" : fullscreenBtn.src = "assets/fullscreen.svg"
    }
    static onVideoChange() {
        const [a, b] = FileManager.hasPreviousNext();
        a ? previousBtn.classList.remove("disabled") : previousBtn.classList.add("disabled");
        b ? nextBtn.classList.remove("disabled") : nextBtn.classList.add("disabled")
    }
    static onProgressChange() {
        Controls.progressDragging = !1;
        video.currentTime = progress.value;
        progress.blur()
    }
    static onProgressInput() {
        Controls.progressDragging = !0;
        Controls.updateTime()
    }
    static onVolumeInput() {
        video.volume = volume.valueAsNumber
    }
    static onVolumeChange() {
        const a = video.volume;
        volume.value = a;
        volumeBtn.src = video.muted ? "assets/volume_off.svg" : .5 < a ? "assets/volume_up.svg" : 0 < a ? "assets/volume_down.svg" : "assets/volume_mute.svg"
    }
    static onVideoEnd() {
        Player.playNext(!1) || WindowManager.exitFullscreen()
    }
    static onPlayerClick(a) {
        0 < clickDblclickTimer ? (clearTimeout(clickDblclickTimer), clickDblclickTimer = 0, WindowManager.toggleFullscreen()) : clickDblclickTimer = setTimeout(function () {
            clickDblclickTimer = 0;
            Player.togglePlay()
        }, 400)
    }
    static onMouseMove(a) {
        a.stopPropagation();
        Controls.hidden && Controls.show();
        clearTimeout(mouseMoveTimer);
        a = a.currentTarget.id;
        let b = 1500;
        "player" == a ? b = 1500 : "controls" == a ? b = 4500 : "settings" == a ? b = 2E4 : "files-container" == a && (b = 25E3);
        mouseMoveTimer = setTimeout(Controls.hide, b)
    }
    static show() {
        Controls.hidden = !1;
        Controls.updateTime();
        controlsPanel.classList.remove("d-none");
        playerPanel.classList.remove("hide-cursor")
    }
    static hide() {
        Controls.hidden = !0;
        controlsPanel.classList.add("d-none");
        playerPanel.classList.add("hide-cursor")
    }
    static async keyboardListener(a) {
        var b = a.target.tagName;
        if ("INPUT" !== b && "SELECT" !== b) {
            b = a.keyCode;
            var c = a.code;
            79 === b && (a.ctrlKey || a.metaKey) ? (a.preventDefault(), FileManager.openFiles()) : 37 === b && (a.ctrlKey || a.metaKey) ? (a.preventDefault(), Player.playPrevious()) : 39 === b && (a.ctrlKey || a.metaKey) ? (a.preventDefault(), Player.playNext()) : 83 !== b || !a.ctrlKey && !a.metaKey || a.shiftKey ? a.ctrlKey || a.altKey || a.metaKey || (70 === b ? (a.preventDefault(), WindowManager.toggleFullscreen()) : 87 === b ? (a.preventDefault(), WindowManager.toggleMaxSize()) : 84 === b ? a.preventDefault() : 75 === b || 32 === b ? (a.preventDefault(), Player.togglePlay()) : 74 === b || 37 === b ? (a.preventDefault(), a.shiftKey ? Player.seek(!1, settings.seekLongStep) : Player.seek(!1, settings.seekStep)) : 76 === b || 39 === b ? (a.preventDefault(), a.shiftKey ? Player.seek(!0, settings.seekLongStep) : Player.seek(!0, settings.seekStep)) : 38 === b ? (a.preventDefault(), Player.volume(!0, settings.volumeStep)) : 40 === b ? (a.preventDefault(), Player.volume(!1, settings.volumeStep)) : "Equal" === c ? (a.preventDefault(), a.shiftKey ? WindowManager.scale(!0) : Player.speed(!0, settings.speedStep)) : "Minus" === c ? (a.preventDefault(), a.shiftKey ? WindowManager.scale(!1) : Player.speed(!1, settings.speedStep)) : "Digit0" === c ? (a.preventDefault(), a.shiftKey ? WindowManager.scaleSize(1) : Player.resetSpeed()) : 67 === b ? a.preventDefault() : 78 === b ? (a.preventDefault(), Player.playNext()) : 77 === b ? (a.preventDefault(), Player.toggleMute()) : 80 === b ? (a.preventDefault(), a.shiftKey ? WindowManager.togglePip() : Player.playPrevious()) : 188 === b ? (a.preventDefault(), Player.seek(!1, .042)) : 190 === b ? (a.preventDefault(), Player.seek(!0, .042)) : 83 === b && a.shiftKey ? (a.preventDefault(), Utils.screenshot()) : 71 === b ? (a.preventDefault(), Player.toggleVideoTime()) : 72 === b ? (a.preventDefault(), Clock.toggleClockTime()) : 66 === b && a.preventDefault()) : a.preventDefault()
        }
    }
}
var lastDragTime = 0,
    dragTimer = 0;
class FileManager {
    static init() {
        FileManager.playIndex = 0;
        FileManager.repeatMode = 0;
        FileManager.inputFile = document.getElementById("file");
        FileManager.inputFile.addEventListener("change", FileManager.onSelectFile);
        document.body.addEventListener("dragover", FileManager.onDropOver);
        document.body.addEventListener("drop", FileManager.onDrop);
        repeatBtn.addEventListener("click", FileManager.updateRepeat);
        addFileBtn.addEventListener("click", FileManager.addFiles)
    }
    static getNextFile(a, b = !0) {
        if (0 == fileList.length || 1 == fileList.length && !1 === fileList[0].canPlay)
            return null;



        if (0 == FileManager.repeatMode) {
            if (a = a ? FileManager.playIndex + 1 : FileManager.playIndex - 1, 0 <= a && a < fileList.length)
                return FileManager.playIndex = a,
                    fileList[a]





        } else {
            if (1 == FileManager.repeatMode || 2 == FileManager.repeatMode && b)
                return a = a ? FileManager.playIndex + 1 : FileManager.playIndex - 1,
                    0 > a ? a = fileList.length - 1 : a >= fileList.length && (a = 0),
                    FileManager.playIndex = a,
                    fileList[a];



            if ((a = fileList[FileManager.playIndex]) && (void 0 === a.canPlay || !0 === a.canPlay))
                return a





        }
        return null
    }
    static hasPreviousNext() {
        return 1 >= fileList.length ? [
            !1,
            !1
        ] : 0 == FileManager.repeatMode ? [
            0 < FileManager.playIndex,
            FileManager.playIndex < fileList.length - 1] : [!0, !0]
    } static openFiles() { FileManager.openMode = "open"; FileManager.inputFile.click() } static addFiles() { FileManager.openMode = "append"; FileManager.inputFile.click() } static onSelectFile(a) { FileManager.updateFileList(this.files, "append" === FileManager.openMode); this.value = null } static updateFileList(a, b = !1) {
        if (0 < a.length) {
            a = Array.from(a); const c = new Intl.Collator; a.sort((d, e) => c.compare(d.name, e.name)); b ? (fileList = fileList.concat(a), Controls.onVideoChange()) : (fileList = a, FileManager.playIndex = 0, Player.loadFile(fileList[0])); FileManager.updatePlaylistUI(a, b)
        }
    } static updatePlaylistUI(a, b) { b || (filelistContainer.innerHTML = ""); for (let c of a) filelistContainer.appendChild(FileManager.createFileItem(c)); filesContainer.classList.add("show") } static createFileItem(a) {
        let b = document.createElement("div"); b.className = "file-item"; b.textContent = a.name; b.addEventListener("click", c => {
            c.stopPropagation();
            c = fileList.indexOf(a);
            -1 !== c && (FileManager.playIndex = c, Player.loadFile(a))
        }
        );
        return b
    }
    static updatePlaylistIndicator() {
        for (var a of filelistContainer.querySelectorAll(".active"))
            a.classList.remove("active");



        (a = filelistContainer.children[FileManager.playIndex]) && a.classList.add("active")
    }
    static updateRepeat(a) {
        a.stopPropagation();
        0 == FileManager.repeatMode ? (FileManager.repeatMode = 1, repeatBtn.src = "assets/repeat.svg") : 1 == FileManager.repeatMode ? (FileManager.repeatMode = 2, repeatBtn.src = "assets/repeat_one.svg") : (FileManager.repeatMode = 0, repeatBtn.src = "assets/playlist_play.svg");
        Controls.onVideoChange()
    }
    static toggleDropzone(a) {
        let b = document.body.firstElementChild,
            c = b.nextElementSibling;
        a ? (b.classList.add("d-none"), c.classList.remove("d-none")) : (b.classList.remove("d-none"), c.classList.add("d-none"))
    }
    static dragEnd() {
        clearInterval(dragTimer);
        dragTimer = 0;
        FileManager.toggleDropzone(!1)
    }
    static onDropOver(a) {
        a.preventDefault();
        a.dataTransfer.dropEffect = "move";
        lastDragTime = performance.now();
        0 == dragTimer && (FileManager.toggleDropzone(!0), dragTimer = setInterval(function () {
            200 < performance.now() - lastDragTime && FileManager.dragEnd()
        }, 200))
    }
    static onDrop(a) {
        a.preventDefault();
        FileManager.dragEnd();
        FileManager.updateFileList(a.dataTransfer.files)
    }
}
class WindowManager {
    static init() {
        WindowManager.saveWindowState()
    }
    static saveWindowState() {
        WindowManager.state = {
            x: window.screenX,
            y: window.screenY,
            width: window.outerWidth,
            height: window.outerHeight
        }
    }
    static restoreState() {
        let a = WindowManager.state;
        a && (window.resizeTo(a.width, a.height), window.moveTo(a.x, a.y))
    }
    static getBrowserHeadHeight() {
        if (void 0 !== WindowManager.browserHeadHeight)
            return WindowManager.browserHeadHeight;



        let a = window.outerHeight - window.innerHeight;
        return 0 < a ? WindowManager.browserHeadHeight = a : 28
    }
    static scaleSize(a) {
        if (popupWindow && 0 < video.videoWidth && 0 < video.videoHeight) {
            var b = WindowManager.getBrowserHeadHeight();
            const c = video.videoWidth / video.videoHeight;
            let d = Math.min(window.screen.availWidth, video.videoWidth * a);
            a = Math.min(window.screen.availHeight, video.videoHeight * a + b);
            let e = Math.floor((a - b) * c);
            e <= d ? d = e : (b = Math.floor(d / c) + b, b <= a && (a = b));
            window.resizeTo(d, a);
            window.moveTo((screen.availWidth - d) / 2 + screen.availLeft, (screen.availHeight - a) / 2 + screen.availTop);
            WindowManager.saveWindowState()
        }
    }
    static scale(a) {
        popupWindow && 0 < video.videoWidth && 0 < video.videoHeight && (a ? a = (window.innerWidth + video.videoWidth / 4) / video.videoWidth : (a = (window.innerWidth - video.videoWidth / 4) / video.videoWidth, a = Math.max(a, .25)), WindowManager.scaleSize(a))
    }
    static isMaxSize() {
        return window.outerWidth == window.screen.availWidth && window.outerHeight == window.screen.availHeight
    }
    static toggleMaxSize() {
        popupWindow && (WindowManager.isMaxSize() ? WindowManager.restoreState() : window.resizeTo(window.screen.availWidth, window.screen.availHeight))
    }
    static async togglePip() {
        document.pictureInPictureEnabled && !video.disablePictureInPicture && 0 !== video.readyState && (getFullscreenElement() && await document.exitFullscreen(), document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture())
    }
    static async toggleFullscreen() {
        document.pictureInPictureElement && await document.exitPictureInPicture();
        getFullscreenElement() ? document.exitFullscreen() : playerPanel.requestFullscreen()
    }
    static exitFullscreen() {
        getFullscreenElement() && document.exitFullscreen()
    }
}
class Settings {
    static async init() {
        seekStepInput.addEventListener("change", Utils.delay(Settings.saveSeekStep, 500));
        seekLongStepInput.addEventListener("change", Utils.delay(Settings.saveSeekLongStep, 500));
        volumeStepInput.addEventListener("change", Utils.delay(Settings.saveVolumeStep, 500));
        speedStepInput.addEventListener("change", Settings.saveSpeedStep);
        screenshotFormatInput.addEventListener("change", Settings.saveScreenshotFormat);
        if (extensionMode)
            return chrome.storage.local.get({
                remainingTimeMode: !1
            }, function (f) {
                remainingTimeMode = f.remainingTimeMode
            }),
                new Promise(function (f, h) {
                    chrome.storage.sync.get(settings, function (g) {
                        settings = g;
                        Settings.initInputValues();
                        f()
                    })
                });



        remainingTimeMode = "true" === localStorage.getItem("remainingTimeMode");
        let a = localStorage.getItem("seekStep"),
            b = localStorage.getItem("seekLongStep"),
            c = localStorage.getItem("volumeStep"),
            d = localStorage.getItem("speedStep"),
            e = localStorage.getItem("screenshotFormat");
        a && (settings.seekStep = parseInt(a, 10));
        b && (settings.seekLongStep = parseInt(b, 10));
        c && (settings.volumeStep = parseInt(c, 10));
        d && (settings.speedStep = parseFloat(d));
        e && (settings.screenshotFormat = e);
        Settings.initInputValues()
    }
    static initInputValues() {
        seekStepInput.value = settings.seekStep;
        seekLongStepInput.value = settings.seekLongStep;
        volumeStepInput.value = settings.volumeStep;
        speedStepInput.value = settings.speedStep;
        screenshotFormatInput.value = settings.screenshotFormat
    }
    static save(a, b) {
        settings[a] = b;
        if (extensionMode) {
            let c = {};
            c[a] = b;
            chrome.storage.sync.set(c)
        } else
            try {
                localStorage.setItem(a, b)
            }
            catch (c) {
                console.log("localStorage error:", c)
            }
    }
    static saveSeekStep(a) {
        1 <= seekStepInput.valueAsNumber && Settings.save("seekStep", seekStepInput.valueAsNumber)
    }
    static saveSeekLongStep(a) {
        1 <= seekLongStepInput.valueAsNumber && Settings.save("seekLongStep", seekLongStepInput.valueAsNumber)
    }
    static saveVolumeStep(a) {
        a = volumeStepInput.valueAsNumber;
        1 <= a && 50 >= a && Settings.save("volumeStep", a)
    }
    static saveSpeedStep(a) {
        a = parseFloat(speedStepInput.value);
        0 < a && 1 >= a && Settings.save("speedStep", a)
    }
    static saveScreenshotFormat(a) {
        Settings.save("screenshotFormat", screenshotFormatInput.value)
    }
    static saveRemainingTimeMode(a) {
        if (extensionMode)
            chrome.storage.local.set({ remainingTimeMode: a });
        else
            try {
                localStorage.setItem("remainingTimeMode", a)
            }
            catch (b) {
                console.log("localStorage error:", b)
            }
    }
}
class I18N {
    static init() {
        let a = document.querySelectorAll("[data-i18n]");
        for (const b of a)
            b.textContent = Messages[b.dataset.i18n]





    }
} I18N.en = {
    title: "Video Player",
    seekStep: "Short Jump",
    seekLongStep: "Long Jump",
    volumeStep: "Volume Jump",
    speedStep: "Speed Jump",
    screenshotFormat: "Screenshot",
    shortcuts: "Shortcuts",
    dropzone: "Drop Video Files Here",
    muted: "Muted",
    unmuted: "Unmuted",
    speedIs: "Speed: ",
    volumeIs: "Volume: ",
    error: "Something wrong",
    cannotSupportFormat: "Can't support this video format",
    notAllowedError: 'The browser does not allow autoplay.\nYou need to change your borwser settings:\nSafari: Preferences \u2192 Websites \u2192 Auto-Play.\nFirefox: Preferences \u2192 Search for "Autoplay".\nChrome: Preferences \u2192 Site settings \u2192 Sound.\n'
};
I18N["zh-CN"] = {
    title: "\u89c6\u9891\u64ad\u653e\u5668",
    seekStep: "\u77ed\u5feb\u8fdb",
    seekLongStep: "\u957f\u5feb\u8fdb",
    volumeStep: "\u97f3\u91cf+/-",
    speedStep: "\u500d\u901f+/-",
    screenshotFormat: "\u622a\u56fe\u683c\u5f0f",
    shortcuts: "\u5feb\u6377\u952e\u8bf4\u660e",
    dropzone: "\u62d6\u62fd\u89c6\u9891\u6587\u4ef6\u5230\u8fd9\u91cc",
    muted: "\u5df2\u9759\u97f3",
    unmuted: "\u5df2\u53d6\u6d88\u9759\u97f3",
    speedIs: "\u500d\u901f: ",
    volumeIs: "\u97f3\u91cf: ",
    error: "\u51fa\u9519\u4e86",
    cannotSupportFormat: "\u4e0d\u652f\u6301\u6b64\u89c6\u9891\u683c\u5f0f",
    notAllowedError: '\u6d4f\u89c8\u5668\u4e0d\u5141\u8bb8\u81ea\u52a8\u64ad\u653e\u3002\n\u60a8\u9700\u8981\u8c03\u6574\u6d4f\u89c8\u5668\u7684\u8bbe\u7f6e\uff1a\nSafari: \u8bbe\u7f6e \u2192 \u7f51\u7ad9 \u2192 \u81ea\u52a8\u64ad\u653e\u3002\nFirefox: \u8bbe\u7f6e \u2192 \u641c\u7d22 "\u81ea\u52a8\u64ad\u653e"\u3002\nChrome: \u8bbe\u7f6e \u2192 \u7f51\u7ad9\u8bbe\u7f6e \u2192 \u58f0\u97f3\u3002\n'
};
var Messages = "zh-CN" == navigator.language ? I18N["zh-CN"] : I18N.en;
async function init() {
    I18N.init();
    await Settings.init();
    Clock.init();
    Player.init();
    Controls.init();
    FileManager.init();
    WindowManager.init()
    Syncronization.init()
};

init()
