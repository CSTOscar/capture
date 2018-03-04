var socket = io.connect('https://' + document.domain+'/', {path: "/capture/socket.io"});
var video = document.querySelector('video#live');
var select = document.querySelector('select#videoSource');

var gotDevices = function(deviceInfos) {
	var value = select.value;

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
		}
	}
	if (Array.prototype.slice.call(select.childNodes).some(function(n) {
		return n.value === value;
	})) {
		select.value = value;
	}
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

var gotStream = function(stream) {
	window.stream = stream; // make stream available to console
	video.srcObject = stream;
	// Refresh button list in case labels have become available
	return navigator.mediaDevices.enumerateDevices();
}

var start = function() {
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

var handleError = function (error) {
	console.log('navigator.getUserMedia error: ', error);
}

select.onchange = start;

start();


$('#connect').on('click', function(){
	socket.emit('start');
})

$('#disconnect').on('click', function(){
	socket.emit('remove', {'camera_id': window.camera_id, 'side': window.side});
})

$('#clear').on('click', function(){
	socket.emit('clear');
})

socket.on('connected', function(data){
	console.log('connected as ' + data.camera_id + 'with side '+ data.side);
	window.camera_id = data.camera_id;
	window.side = data.side;
	$('#side').val(data.side);
	socket.emit('ready');
});

var capture = function(){
	console.log('Record here');
}

socket.on('startRecording', function(data){
	var time = new Date(data.time);
	console.log('Starting Recording at: ' + time);
	setTimeout(function() {
		capture();
		setTimeout(capture, data.interval);
	}, time - new Date());
});

socket.on('wait', function(){
	console.log("Waiting...");
});

socket.on('error', function(data){
	console.log(data.error);
});
