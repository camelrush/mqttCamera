// constants
var MQTT_TOPIC_PUB = 'mqttCameraControl' // Mqtt Toic(publish) 
var MQTT_TOPIC_SUB = 'mqttCameraMjpeg'   // Mqtt Toic(subscribe)

// variables
var camangleH_controller;
var camangleV_controller;
var mqtt_client;

// Docuent Ready Event
$(document).ready(function() {

    // Create Horizontal CameraController 
    camangleH_controller = new OneWayController($('#camangle-h-ctrl-cvs')[0], $('#camangle-h-ctrl-val') ,controller_onChanged ,
                    {orientation :'horizon' , maxvalue :20 ,threshold :2});

    // Create Virtical CameraController 
    camangleV_controller = new OneWayController($('#camangle-v-ctrl-cvs')[0], $('#camangle-v-ctrl-val') ,controller_onChanged ,
                    {orientation :'virtical' ,maxvalue :20 ,threshold :2});

    // MqttConnection Connect Button Event Handler
    $('#btn-connect').click(function(){

        // Connect
        if ($('#btn-connect').val() == 'Connect'){

            // Set Signature To URL
            var credentials = {};
            credentials.accessKeyId = $('#akey').val();
            credentials.secretAccessKey = $('#skey').val();
            var requestUrl = SigV4Utils.getSignedUrl('xxxxxxxxxxxxxx-xxx.iot.ap-northeast-1.amazonaws.com', 'ap-northeast-1', credentials);

            // Connect to Mqtt Broker(on AWS)
            var clientId = 'awss3_controller';
            mqtt_client = new Paho.Client(requestUrl, clientId);
            var connectOptions = {
                useSSL: true,
                timeout: 3,
                mqttVersion: 4,
                onSuccess: mqtt_onConnect
            };
            mqtt_client.connect(connectOptions);
            mqtt_client.onMessageArrived = mqtt_onMessageArrived;
            mqtt_client.onConnectionLost = mqtt_onConnectionLost;

        // DisConnect
        } else {
            mqtt_client.disconnect();
            mqtt_client = null;
        }
    });

    // Camera On/Off Switch Event Handler
    $('input[name="sample1radio"]:radio').change(function(){

        var checked = $('#sample1on').prop('checked');

        // On/Off Switch Display Change. 
       if (checked == false){
            $('#capture-view').css('visibility','hidden');
        }

        // Mqtt publish.
        var data = {
            action : 'camera_onoff',
            power: (checked ? 'on' : 'off'),
        };
        var msg = new Paho.Message(JSON.stringify(data));
        msg.destinationName = MQTT_TOPIC_PUB;
        mqtt_client.send(msg);
    });
});

// Controller Value Changed Event Handler
function controller_onChanged(){

    if (mqtt_client == null) return;

    var data = {
        action : 'control',
        camangle_h: camangleH_controller.getValue(),
        camangle_v: camangleV_controller.getValue(),
    };

    // mqtt publish.
    var msg = new Paho.Message(JSON.stringify(data));
    msg.destinationName = MQTT_TOPIC_PUB;
	mqtt_client.send(msg);
}

// mqtt Connected Event Handler
function mqtt_onConnect()
{
    // Entry Mqtt Subscribe.
    mqtt_client.subscribe(MQTT_TOPIC_SUB);

    // Button Display Change. 
    $('#btn-connect').val('DisConnect');
	console.log('connected');
}

// MQTT MessageArrived Event Handler
function mqtt_onMessageArrived(msg)
{
    // On/Off Switch Display Change 
    if ($('#sample1on').prop('checked') && $('#capture-view').css('visibility')=='hidden'){
        $('#capture-view').css('visibility','visible');
    }

    // Set Image Source to MJpeg from Camera  
    $('#capture-view').attr('src','data:image/jpg;base64,' + msg.payloadString);
}

// MQTT ConnectionLost Event Handler
function mqtt_onConnectionLost(responseObject) 
{
    // Error Case
    if (responseObject.errorCode !== 0) {
        console.log('onConnectionLost:'+responseObject.errorMessage);
        return;
    }

    // Button Display Change. 
    $('#btn-connect').val('Connect');
    console.log('onConnectionLost');
}
