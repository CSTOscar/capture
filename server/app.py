from flask import Flask, render_template, session
from flask_socketio import SocketIO, send, emit
from datetime import datetime, timedelta 
from uuid import uuid4
from io import BytesIO
from PIL import Image
import base64

NUM_STEPS = 10

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
sio = SocketIO(app)

cameras = dict()
images = dict()


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
        emit('started', payload, json=True)


@sio.on('ready')
def ready():
    print(cameras)
    if len(cameras) == 2:
        emit('startRecording', {
            'time': (datetime.utcnow() + timedelta(seconds=2)).isoformat(),
            'interval': 250, # in ms
            'steps': NUM_STEPS
        }, broadcast=True)
    else:
        emit('wait')


@sio.on('stop')
def stop():
    emit('stopAll', broadcast=True)
    print('Stopping..')
    


@sio.on('remove')
def remove(data):
    cid = data.get('camera_id')
    if cid in cameras.keys():
        del cameras[cid]
    emit('stopped')


@sio.on('capture')
def capture(data):
    print("Data from: ", data['side'], "on step: ", data['step'])
    with open('image_{}_{}.jpg'.format(data['side'],data['step']), 'wb') as f:
        if data['step'] not in images.keys():
            images[data['step']] = dict()
        images[data['step']][data['side']] = Image.open(BytesIO(base64.b64decode(data['image'])))

@sio.on('done')
def done():
    ## Do stuff with images
    pass
    

if __name__ == "__main__":
    sio.run(app, '0.0.0.0', 8000, use_reloader=True, log_output=True) 
