const http = require("http");
const xmlBuilder = require("xmlbuilder");
const jsonCode = require("./IRCCode.json");
const reqObject = {
    host : "192.168.0.110",
    port : "80",
    method : "POST",
    path : "/IRCC",
    headers : {
        "Content-Type" : "text/xml"
    }
}
const socket = require("socket.io");
const AFFIX = {
    NUM : "Num",
    UP : "Up",
    DOWN : "Down",
    VOL : {
        NAME : "Volume",
        MUTE : "Mute"
    },
    CHANNEL : {
        NAME : "Channel"
    }
}

const keyPressFunction = {
    togglePlay : 1,
    arrayPlay : ["Play","Pause"],
    "\u001b[A" : function() {
        setVolume(4);
    },
    "\u001b[B" : function() {
        setVolume(-4);
    },
    "\u001b[D" : function() {
        tuneChannel(-1);
    },
    "\u001b[C" : function() {
        tuneChannel(1);
    },
    "m" :function() {
        setVolume(0);
    },
    "c" : function() {
        subTitleToggle();
    },
    "`" : function() {
        pushRequest(
            "Input"
        )
    },
    "setChannel" : function(a) {
        //As the array is reference only we need to clone them :D
        let clonedArray = a.slice(0, a.length);
        setChannel(clonedArray);
    },
    "r" : function() {
        pushRequest(
            "Return"
        )
    },
    "p" : function() {
        pushRequest(
            this.arrayPlay[
                this.togglePlay % 2
            ]
        )
        this.togglePlay++;
    },
    "i" : function() {
        pushRequest(
            "PictureOff"
        )
    },
    "q" : function() {
        pushRequest(
            "PowerOff"
        )
    },
    "g" : function() {
        pushRequest(
            "EPG"
        )
    },
    "h" : function() {
        pushRequest(
            "Home"
        )
    },
    "k" : function() {
        pushRequest(
            "Confirm"
        )
    },
    "w" : function() {
        pushRequest(
            "Up"
        )
    },
    "a" : function() {
        pushRequest(
            "Left"
        )
    }
    ,
    "s" : function() {
        pushRequest(
            "Down"
        )
    },
    "d" : function() {
        pushRequest(
            "Right"
        )
    }
}

function setXMLObject(command) {

    if(!(command in jsonCode))
        return null;

    let xmlObject = {
        "s:Envelope" : {
            "@xmlns:s" : "http://schemas.xmlsoap.org/soap/envelope/" ,
            "@s:encodingStyle" : "http://schemas.xmlsoap.org/soap/encoding/",
            "s:Body" : {
                "u:X_SendIRCC": {
                    "@xmlns:u": "urn:schemas-sony-com:service:IRCC:1"
                },
                "IRCCCode" : {
                    "#text" : jsonCode[command]
                }
            }
        }
    }

    return xmlBuilder.create(xmlObject).end();
}

function pushRequest(command) {
    
    const request = http.request(
        reqObject
    )

    request.addListener("error", function(e) {
        console.log(
            "Error on finding the TV\n" +
            "Make sure your TV is connected to your LAN"
        );
    })

    request.write(
        setXMLObject(command) || ""
    );
    

    request.end();
}

function timedLoop(func, argumentList,timeDifference) {
    let interval = setInterval(function() {
        if(!func.apply(func, argumentList))
            clearInterval(interval); 
    }, timeDifference);
}

function setChannel(channelArray) {
    let iterateChannel = {
        array : channelArray, 
        index : 0
    }

    timedLoop(function() {

        let channel = arguments[0].array;
        let index = arguments[0].index;

        if(index >= channel.length)
            return 0;

        pushRequest(
            AFFIX.NUM + channel[index]
        );

        arguments[0].index++;
        return 1;
    }, [iterateChannel], 150);

}

function tuneChannel(delta) {
    if(!delta) {
        return ;
    }

    let object = {
        delta : delta,
        y : 0
    }

    timedLoop(function() {
        const object = arguments[0];
        const delta = object.delta;
        const y = object.y;
        const diff = Math.abs(delta);

        if(y >= diff) {
            return 0;
        }

        const sign = delta / diff;
        const suffix = (sign > 0) ? AFFIX.UP : AFFIX.DOWN;

        pushRequest(
            AFFIX.CHANNEL.NAME + suffix
        );

        object.y++;
        return 1;

    }, [object], 100)

}

function setVolume(delta) {
    
    if(!delta) {
        pushRequest(
            AFFIX.VOL.MUTE
        )
        return 0;
    }

    let object = {
        delta : delta,
        x : 0
    }

    timedLoop(function() {
        
        const object = arguments[0];
        const delta = object.delta;
        const x = object.x;
        const diff = Math.abs(delta);

        if(x >= diff) {
            return 0;
        }

        const sign = delta / diff;
        const suffix = (sign > 0) ? AFFIX.UP : AFFIX.DOWN;

        pushRequest(
            AFFIX.VOL.NAME + suffix
        );

        object.x++;
        return 1;
    }, [object], 80);


}

function subTitleToggle() {
    pushRequest(
        "SubTitle"
    );
}

function loop() {

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let digitRegex = /\d/;
    let numKey = [];

    process.stdin.on("data", function(key) {
        if(key === "\u0004") {
            process.exit();
        }

        if(key in keyPressFunction) {
            keyPressFunction[key]();
            return ;
        }

        if(digitRegex.test(key)) {
            numKey.push(
                parseInt(key)
            );
         }

        if(numKey.length == 3 || key === 'e' && numKey.length > 0) {
            
            keyPressFunction['setChannel'](
                numKey
            )

            while(numKey.length) {
                numKey.pop();
            }
        }
    })
}

loop();
