from flask import Flask, render_template, session
from flask_socketio import SocketIO, send, emit
from datetime import datetime, timedelta
from uuid import uuid4

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
sio = SocketIO(app)

cameras = dict()


@sio.on('start')
def start():
    if len(cameras) >= 2:
        emit('error', {'error': 'Too many cameras'})
    else:
        session['camera_id'] = str(uuid4());
        payload = {'camera_id': session['camera_id']}
        if 'left' not in cameras.values():
            cameras[session['camera_id']] = 'left';
            payload.update({'side': 'left'})
        else:
            cameras[session['camera_id']] = 'right';
            payload.update({'side': 'right'})
        emit('connected', payload, json=True)


@sio.on('ready')
def ready():
    print(cameras)
    if len(cameras) == 2:
        emit('startRecording', {
            'time': (datetime.utcnow() + timedelta(seconds=2)).isoformat(),
            'interval':  200 # in ms
        }, broadcast=True)
    else:
        emit('wait')


@sio.on('remove')
def remove(data):
    cid = data.get('camera_id')
    if cid in cameras.keys():
        del cameras[cid]
    print(cid + "disconnected.")
    print(data)


@sio.on('capture')
def capture(data):
    # decrypt image & time out of data
    # store image somewhere for test 
    # add it to list of images
    print("Start Capturing")
    pass


@sio.on('clear')
def clear():
    for k in cameras.keys():
        del cameras[k]

if __name__ == "__main__":
    sio.run(app, '0.0.0.0', 8000, use_reloader=True, log_output=True) 
