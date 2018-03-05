var socket = io.connect('https://' + document.domain+'/', {path: "/capture/socket.io"});
var video = document.querySelector('video#live');
var select = document.querySelector('select#videoSource');
var recording = true;
var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
var width, height;

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
    width = video.clientWidth;
    height = video.clientHeight;

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


$('#start').on('click', function(){	
	$(this).prop('disabled', true);
	socket.emit('start');	
	recording = true;
	$('#stop').removeAttr('disabled');
})

$('#stop').on('click', function(){	
	$(this).prop('disabled', true);
	recording = false;
	$('#start').removeAttr('disabled');
	socket.emit('stop');
})

socket.on('stopAll', function(){
	console.log('STOP');
	$('#stop').prop('disabled', true);
	$('#start').removeAttr('disabled');
	$('#status').text('Stopped.');
	socket.emit('remove', {'camera_id': window.camera_id, 'side': window.side});
})

socket.on('started', function(data){
	console.log('Connected as ' + data.camera_id + 'with side '+ data.side);
	$('#status').text('Connected as ' + data.camera_id + 'with side '+ data.side);
	window.camera_id = data.camera_id;
	window.side = data.side;
	$('#side').val(data.side);
	socket.emit('ready');
});

var capture = function(step, interval) {
	if(recording) {
		canvas.width = width;
		canvas.height = height;
		console.log('Recording...');
		$('#status').text('Recording step: '+step);
		console.log('Width: ' + width + 'Height: ' + height);
		ctx.drawImage(video, 0, 0, width, height);
		var strData = canvas.toDataURL('image/jpeg').replace('data:image/jpeg;base64,','');
		socket.emit('capture', {'step': step, 'side': window.side, 'image': strData});
		if(step + 1 < window.steps){
			setTimeout(capture.bind(undefined, step + 1, interval), interval);
		} else {
			$('#stop').click();
		}
	}
}

socket.on('startRecording', function(data){
	var time = new Date(data.time);	
	window.steps = data.steps;
	$('#status').text('Starting Recording at: ' + time);
	console.log('Starting Recording at: ' + time);
	console.log('Steps: ' + window.steps);
	setTimeout(function() {
		capture(0, data.interval);
	}, time - new Date());
});

socket.on('wait', function(){
	$('#status').text('Waiting...');
	console.log("Waiting...");
});

socket.on('stopped', function(data){
	window.side = undefined;
	window.camera_id = undefined;
});

socket.on('error', function(data){
	console.log(data.error);
});
