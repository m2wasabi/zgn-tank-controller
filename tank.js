ZGN(function()
{
    // 初期設定
    var accel = 0;

    var degree = 0;
    var prev_degree;
    var zero_angle = 0;

    var pin = {
        'CR_1'      :{'id':'17','mode':ZGN.OUTPUT},
        'CR_2'      :{'id':'27','mode':ZGN.OUTPUT},
        'CR_PWM'    :{'id':'18','mode':ZGN.PWM},
        'CL_1'      :{'id':'22','mode':ZGN.OUTPUT},
        'CL_2'      :{'id':'23','mode':ZGN.OUTPUT},
        'CL_PWM'    :{'id':'13','mode':ZGN.PWM},
        'ROT_L'     :{'id':'5' ,'mode':ZGN.OUTPUT},
        'ROT_R'     :{'id':'6' ,'mode':ZGN.OUTPUT},
        'TILT'      :{'id':'24','mode':ZGN.OUTPUT},
        'LIGHT'     :{'id':'16','mode':ZGN.OUTPUT}
    };

    var gpio = ZGN.term('1').gpio;
    $.each(pin,function(i,val){
        gpio.pinMode(val.id, val.mode);
        if(val.mode == ZGN.OUTPUT) {
            gpio.digitalWrite(val.id, ZGN.LOW);
        } else if(val.mode == ZGN.PWM) {
            gpio.pwmWrite(val.id, 1);
        }
    });

    // Slider With JQuery
    var accelSlider = $("#accel").slider({
        tooltip: "always",
        handle: "squre",
        precision: 2,
        reversed : true
    });

    $("#accel").slider().on('slide', $.throttle(100,function(){
        var old_accel = accel;
        accel = $("#accel").slider('getValue');
        if(old_accel != accel) {
            moveControl(accel, degree);
        }
    }));

    // Touch events
    $("#action-forward").click(function(){
        accel = 100;
        accelSlider.slider('setValue', accel);
        moveControl(accel, degree);
    });
    $("#action-stop").click(function(){
        accel = 0;
        accelSlider.slider('setValue', accel);
        moveControl(accel, degree);
    });
    $("#action-reverse").click(function(){
        accel = -100;
        accelSlider.slider('setValue', accel);
        moveControl(accel, degree);
    });

    $("#action-adjust").click(function(){
        zero_angle = angle_z;
    });

    $("#action-light-on").click(function(){
        gpio.digitalWrite(pin.LIGHT.id, ZGN.HIGH);
    });
    $("#action-light-off").click(function(){
        gpio.digitalWrite(pin.LIGHT.id, ZGN.LOW);
    });

    $("#action-cannon-v").bind('touchstart', function(){
        gpio.digitalWrite(pin.TILT.id, ZGN.HIGH);
    });
    $("#action-cannon-v").bind('touchend', function(){
        gpio.digitalWrite(pin.TILT.id, ZGN.LOW);
    });

    $("#action-cannon-l").bind('touchstart', function(){
        gpio.digitalWrite(pin.ROT_L.id, ZGN.HIGH);
        gpio.digitalWrite(pin.ROT_R.id, ZGN.LOW);
    });
    $("#action-cannon-l").bind('touchend', function(){
        gpio.digitalWrite(pin.ROT_L.id, ZGN.LOW);
        gpio.digitalWrite(pin.ROT_R.id, ZGN.LOW);
    });

    $("#action-cannon-r").bind('touchstart', function(){
        gpio.digitalWrite(pin.ROT_L.id, ZGN.LOW);
        gpio.digitalWrite(pin.ROT_R.id, ZGN.HIGH);
    });
    $("#action-cannon-r").bind('touchend', function(){
        gpio.digitalWrite(pin.ROT_L.id, ZGN.LOW);
        gpio.digitalWrite(pin.ROT_R.id, ZGN.LOW);
    });

    // justgage
    var g = new JustGage({
    id: "g1",
    value: 0,
    min: -90,
    max: 90,
    title: "Steering"
    });   
    

    // Devicemotion
    window.addEventListener("devicemotion", $.throttle(100,function(evt){
        // 重力加速度
        var xg = evt.accelerationIncludingGravity.x;
        var yg = evt.accelerationIncludingGravity.y;
        var zg = evt.accelerationIncludingGravity.z;
        // 角度
        angle_z = Math.floor(Math.atan2(yg,xg)/Math.PI * 180);
        degree = angle_z - zero_angle;
        if(degree > 180){
            degree -= 360;
        } else if (degree < -180) {
            degree += 360;
        }
//        var txt  = "atan 傾きz:"+ angle_z +"<br>zero :" + zero_angle + "<br>result :" + degree;
//        $("#status").html(txt);

        if(prev_degree != degree) {
            moveControl(accel, degree);
        }
        console.log("prev_degree: " + prev_degree + " -> degree: " + degree);

        g.refresh(degree);
        prev_degree = degree;

    }), true);

    function updateAccel(pin1,pin2,pinPwm,value) {
      var pwmPow = 100 - Math.abs(value);
      if(value > 0){
        gpio.digitalWrite(pin1, ZGN.HIGH);
        gpio.digitalWrite(pin2, ZGN.LOW);
        gpio.pwmWrite(pinPwm, pwmPow / 200);
        console.log("PWM(" + pinPwm + "): " + pwmPow / 200);
      }else if(value < 0){
        gpio.digitalWrite(pin1, ZGN.LOW);
        gpio.digitalWrite(pin2, ZGN.HIGH);
        gpio.pwmWrite(pinPwm, pwmPow / 200);
        console.log("PWM(" + pinPwm + "): " + pwmPow / 200);
      }else{
        gpio.digitalWrite(pin1, ZGN.LOW);
        gpio.digitalWrite(pin2, ZGN.LOW);
        gpio.pwmWrite(pinPwm, 1);
      }
    }

    function moveControl(accel, degree){
        var CR = 0;
        var CL = 0;
        var sinDegree = Math.abs(Math.sin(degree * (Math.PI / 180)));
        if(accel == 0) {
            if(degree == 0) {
                CR = 0;
                CL = 0;
            } else if(degree > 0) {
                CR = -100 * sinDegree;
                CL = 100 * sinDegree;
            } else if(degree < 0) {
                CR = 100 * sinDegree;
                CL = -100 * sinDegree;
            }
        } else {
            if(degree == 0) {
                CR = accel;
                CL = accel;
            } else if(degree > 0) {
                CR = accel * (1 - sinDegree);
                CL = accel;
            } else if(degree < 0) {
                CR = accel;
                CL = accel * (1 - sinDegree);
            }
        }
        
        updateAccel(pin.CR_1.id,pin.CR_2.id,pin.CR_PWM.id ,CR);
        updateAccel(pin.CL_1.id,pin.CL_2.id,pin.CL_PWM.id ,CL);
    }

});
