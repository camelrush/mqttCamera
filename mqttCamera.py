from devices.motor import ServoMotorSG92 as SG92
from devices.camera import VideoCamera as camera
import paho.mqtt.client
import ssl
import asyncio
import json
import time
import base64

# GPIO Define
GPIO_CAMERA_H_PWM = 2   # Horizontal Camera Control GPIO 
GPIO_CAMERA_V_PWM = 3   # Virtical Camera Control GPIO

# Mqtt Define
AWSIoT_ENDPOINT = "xxxxxxxxxxxxxx-xxx.iot.ap-northeast-1.amazonaws.com"
MQTT_PORT = 8883
MQTT_TOPIC_SUB = "mqttCameraControl"
MQTT_TOPIC_PUB = "mqttCameraMjpeg"
MQTT_ROOTCA = "./awscert/AmazonRootCA1.pem"
MQTT_CERT = "./awscert/xxxxxxxxxx-certificate.pem.crt"
MQTT_PRIKEY = "./awscert/xxxxxxxxxx-private.pem.key"

# new Control Motor.
camera_servo_h = SG92(GPIO_CAMERA_H_PWM)
camera_servo_v = SG92(GPIO_CAMERA_V_PWM)

# new Camera.
mjpeg_camera = None
mjpeg_pub_enable = False

def mqtt_connect(client, userdata, flags, respons_code):
    print('mqtt connected.') 
    # Entry Mqtt Subscribe.
    client.subscribe(MQTT_TOPIC_SUB)
    print('subscribe topic : ' + MQTT_TOPIC_SUB) 
 
def mqtt_message(client, userdata, msg):
    # Get Received Json Data 
    json_dict = json.loads(msg.payload)
    
    # Control Camera On/Off
    if json_dict['action'] == 'camera_onoff':
        print('camera_onoff : ' + json_dict['power']) 
        global mjpeg_pub_enable ,mjpeg_camera
        if json_dict['power'] == 'on':
            mjpeg_camera = camera()
            mjpeg_pub_enable = True
        else:
            mjpeg_camera = None
            mjpeg_pub_enable = False

    # Control Servo Motor
    elif json_dict['action'] == 'control':
        camangle_h = float(json_dict['camangle_h']) * -1
        camangle_v = float(json_dict['camangle_v'])
        camera_servo_h.move(camangle_h)
        camera_servo_v.move(camangle_v)
        print("camangle h:{0},camangle v:{1}".format(camangle_h,camangle_v))

# MJpeg Publish Loop
async def mjpeg_loop():
    while True:
        global mjpeg_pub_enable, mjpeg_camera 
        if mjpeg_pub_enable == True:
            # capture 1 frame
            frame = mjpeg_camera.get_frame()
            # mqtt Publish
            client.publish(MQTT_TOPIC_PUB,base64.b64encode(frame))

# Main Procedure
if __name__ == '__main__':
    # Mqtt Client Initialize
    client = paho.mqtt.client.Client()
    client.on_connect = mqtt_connect
    client.on_message = mqtt_message
    client.tls_set(MQTT_ROOTCA, certfile=MQTT_CERT, keyfile=MQTT_PRIKEY, cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2, ciphers=None)

    # Connect To Mqtt Broker(aws)
    client.connect(AWSIoT_ENDPOINT, port=MQTT_PORT, keepalive=60)

    # Start Mqtt Subscribe 
    client.loop_start()

    # Start MJpeg Publish Loop 
    loop = asyncio.get_event_loop()
    loop.run_until_complete(mjpeg_loop())
