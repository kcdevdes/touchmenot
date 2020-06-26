/**
@ developer : Kevin Choi
@ date : July 19th 2019, Friday
@ URL : http://52.79.243.39:12000/
@ description :
This server receives TouchMeNot Client JSON Files throughout specific URL
for sorting and providing Database Server JSON informations.
*/

var express = require("express");
var moment = require("moment");
var request = require("request");
var logger = require("./logger");
var router = express.Router();

// Logger를 시작합니다.
logger.onStart();

/* function
dict에 탐색을 원하는 모든 요소를 dictionary값으로 넣어서,
json에 모든 컴포넌트가 존재하는 지 확인한 후,
일치 시 true를 반환합니다.
*/
function checkProperties(dict, json) {
    for (var key in dict) {
        if (!json.hasOwnProperty(dict[key])) {
            return false;
        }
    }
    return true;
}

/* function
jsonObj 파라미터가 JSON인지 검사합니다.
진리일 시 True, 아닐 시 false를 반환합니다.
 */
function isJSON(jsonObj) {
    try {
        // JSON으로 stringify 시도를 합니다.
        var jsonStr = JSON.stringify(jsonObj);
        JSON.parse(jsonStr);
        logger.onSendingMsgInfo(jsonStr);
    } catch (e) {
        //console.log('Not JSON');
        logger.onSendingMsgError("Not JSON");
        return false;
    }
    return true;
}

/* function
length만큼의 길이를 가진 랜덤한 아이디를 제작후 변환합니다.
*/
function makeRandomId(length) {
    var result = "";
    var characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }
    return result;
}

/* function
ip를 가지고 옵니다.
*/
function getUserIP(req) {
    var ipAddress =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    return ipAddress.substr(7, ipAddress.length - 1);
}

/*
  POST JSON processing
*/
router.post("/", (req, res, next) => {
    /* 접속 정보 */
    const IP = getUserIP(req);

    // Log에 IP 정보를 출력합니다.
    logger.onSendingMsgInfo("CONN IP - " + IP);

    /** 파일 입력 및 검사 **/
    // body는 req의 본체로 JSON파일을 받습니다.
    var inputItem = req.body;
    // JSON object를 처리하기 위한 변수입니다.
    var jsonObj = null;
    // 유효한 JSON 파일인지 겁사합니다.
    if (isJSON(inputItem)) {
        jsonObj = JSON.parse(JSON.stringify(inputItem));
    } else {
        res.json({
            type: "error",
            msg: "Not JSON",
        });
        return;
    }

    // type 속성 존재 여부 확인
    if (!checkProperties(["type"], jsonObj)) {
        logger.onSendingMsgError("Cannot find Type");
        res.json({
            type: "error",
            msg: "Cannot find Type",
        });
        return;
    }

    /** Database Server로 전송하기 위한 과정 **/
    /* 타입 분류 */
    switch (jsonObj["type"]) {
        // 새로운 유저 등록
        case "new":
            // 유효성 확인
            if (!checkProperties(["token"], jsonObj)) {
                logger.onSendingMsgError("Wrong Properties");
                res.json({
                    type: "error",
                    msg: "Wrong properties",
                });
                return;
            }

            // ID를 발급합니다. 아이디는 날짜와 랜덤 문자열을 결합하여 제작합니다.
            var userID =
                parseInt(moment().format("MMDDHHmmss")).toString(16) +
                makeRandomId(8);

            // post 전송을 위한 규격입니다.
            // 이 규격은 Database Server의 규격에 따릅니다.
            var options = {
                url: "http://localhost:14000",
                method: "POST",
                json: {
                    type: jsonObj["type"],
                    ip: IP,
                    id: userID,
                    token: jsonObj["token"],
                    abnormally_terminated: false,
                },
            };

            // post 형식으로 options를 전송, 이후 받아온 결과를
            // json 형태로 반환합니다. json 형태는 docs를 참고하세요.
            request(options, (error, response, body) => {
                // statusCode는 https requestCode입니다. 200은 OK 사인입니다
                if (!error && response.statusCode == 200 && body.psnum == 100) {
                    logger.onSendingMsgInfo("Issued New ID - " + userID);
                    // 완료 되었을 때 반환 json입니다.
                    res.json({
                        type: "user_id",
                        id: userID,
                    });
                } else {
                    // 에러 발생 시 결과 반환입니다.
                    logger.onSendingMsgError("Cannot Save User Data");
                    res.json({
                        type: "error",
                        msg: "Cannot Save User Data",
                    });
                }
            });
            break;

        // 생존 확인 유저 등록
        case "alive":
            // 유효성 확인
            if (!checkProperties(["id"], jsonObj)) {
                logger.onSendingMsgError("Wrong Properties");
                res.json({
                    type: "error",
                    msg: "Wrong properties",
                });
                return;
            }

            var options = {
                url: "http://localhost:14000",
                method: "POST",
                json: {
                    type: jsonObj["type"],
                    id: jsonObj["id"],
                },
            };

            // request 결과를 반환하여 json형태로 response 합니다.
            request(options, (_err, _res, _body) => {
                if (!_err && _res.statusCode === 200 && _body.psnum === 100) {
                    logger.onSendingMsgInfo("Res Alive OK Msg");
                    res.json({
                        type: "alive_ok",
                    });
                } else {
                    logger.onSendingMsgError(
                        "No token that depends on this user_id"
                    );
                    res.json({
                        type: "error",
                        msg: "No token that depends on this user_id",
                    });
                }
            });
            break;

        // 생존 확인 유저 등록
        case "alive_stop":
            // 유효성 확인
            if (!checkProperties(["id"], jsonObj)) {
                logger.onSendingMsgError("Wrong Properties");
                res.json({
                    type: "error",
                    msg: "Wrong properties",
                });
                return;
            }

            var options = {
                url: "http://localhost:14000",
                method: "POST",
                json: {
                    type: jsonObj["type"],
                    id: jsonObj["id"],
                },
            };

            // request 결과를 반환하여 json형태로 response 합니다.
            request(options, (_err, _res, _body) => {
                if (!_err && _res.statusCode == 200 && _body.psnum == 100) {
                    logger.onSendingMsgInfo("Res Alive Stop OK Msg");
                    res.json({
                        type: "alive_stop_ok",
                    });
                }
            });
            break;

        

        default:
            logger.onSendingMsgError("Wrong Type");
            res.json({
                type: "error",
                msg: "Wrong type",
            });
            break;
    }
});

module.exports = router;