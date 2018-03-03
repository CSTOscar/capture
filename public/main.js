'use strict';
/*
var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('connect', function() {
	socket.emit('my event', {data: 'I\'m connected!'});
});
*/

var video = document.querySelector('video#live');
var select = document.querySelector('select#videoSource');

function gotDevices(deviceInfos) {
	var values = select.value;

	while (select.firstChild) {
		select.removeChild(select.firstChild);
	}

	for (var i = 0; i !== deviceInfos.length; ++i) {
		var deviceInfo = deviceInfos[i];
		var option = document.createElement('option');
		option.value = deviceInfo.deviceId;
		if (deviceInfo.kind === 'videoinput') {
			option.text = deviceInfo.label || 'camera ' + (select.length + 1);
			select.appendChild(option);
		} else {
			console.log('Some other kind of source/device: ', deviceInfo);
		}
	}
	if (Array.prototype.slice.call(select.childNodes).some(function(n) {
		return n.value === values;
	})) {
		select.value = values;
	}
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

function gotStream(stream) {
	window.stream = stream; // make stream available to console
	video.srcObject = stream;
	// Refresh button list in case labels have become available
	return navigator.mediaDevices.enumerateDevices();
}

function start() {
	if (window.stream) {
		window.stream.getTracks().forEach(function(track) {
			track.stop();
		});
	}
	var videoSource = select.value;
	var constraints = {
		video: {deviceId: videoSource ? {exact: videoSource} : undefined}
	};
	navigator.mediaDevices.getUserMedia(constraints)
		.then(gotStream).then(gotDevices).catch(handleError);
}

select.onchange = start;

start();

function handleError(error) {
	console.log('navigator.getUserMedia error: ', error);
}
