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
const { json } = require("express");
var router = express.Router();
var buffer = require("buffer");
var path = require("path");
var fs = require("fs");
const { rejects } = require("assert");

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
        // logger.onSendingMsgInfo(jsonStr);
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

function generateJSONResponse(type, id, command, pwd) {
    let JSONObject = new Object();
    let responseJSON = new Array();
    if (type !== null) {
        JSONObject.type = type;
    }
    if (id !== null) {
        JSONObject.id = id;
    }
    if (!(command === null || command === "")) {
        JSONObject.command = command;
    }
    if (!(pwd === null || pwd === "")) {
        JSONObject.pwd = pwd;
    }

    responseJSON.push(JSONObject);

    return JSONObject;
}

function encode_base64(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, "../images/", filename), function (
            error,
            data
        ) {
            if (error) {
                reject(new Error(error));
            } else {
                var buf = Buffer.from(data);
                var base64 = buf.toString("base64");
                resolve(base64);
            }
        });
    });
}

function decode_base64(base64str, filename) {
    return new Promise((resolve, reject) => {
        var buf = Buffer.from(base64str, "base64");

        fs.writeFile(
            path.join(__dirname, "../images/", filename),
            buf,
            async function (error) {
                if (error) {
                    reject(new Error(error));
                } else {
                    resolve(true);
                }
            }
        );
    });
}

function deleteDBCommand(id) {
    var options = {
        url: "http://localhost:14000",
        method: "POST",
        json: {
            type: "mb_delete",
            id: id,
        },
    };
    request(options, (err, res) => {
        if (err) logger.onSendingMsgError("delete error");
    });
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

router.get("/", (req, res) => {
    var IP = getUserIP(req);
    var option = {
        url: "http://ip-api.com/json/" + IP,
        method: "GET",
    };
    request(option, (err, response) => {
        if (err) {
            res.json({
                ip: IP,
            });
        } else {
            res.json({
                ip: IP,
                location: response.country,
                region: response.regionName,
                city: response.city,
                isp: response.isp,
                as: response.as,
                msg: ["Unexpected access has been detected"],
            });
        }
    });
});

router.post("/", async (req, res, next) => {
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
                if (!error && response.statusCode == 200 && body.code == 100) {
                    logger.onSendingMsgInfo("Issued New ID - " + userID);
                    // 완료 되었을 때 반환 json입니다.
                    // res.json({
                    //     type: "user_id",
                    //     id: userID,
                    // });

                    res.json(
                        generateJSONResponse("user_id", userID, null, null)
                    );
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
                if (!_err && _res.statusCode === 200 && _body.code === 100) {
                    logger.onSendingMsgInfo("Res Alive OK Msg");
                    // res.json({
                    //     type: "alive_ok",
                    // });

                    deleteDBCommand(_body.user_id);

                    res.json(
                        generateJSONResponse(
                            "alive_ok",
                            null,
                            _body.command,
                            _body.pwd
                        )
                    );
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
                if (!_err && _res.statusCode == 200 && _body.code == 100) {
                    logger.onSendingMsgInfo("Res Alive Stop OK Msg");
                    // res.json({
                    //     type: "alive_stop_ok",
                    // });

                    /* TODO : 명령어 삭제 */
                    deleteDBCommand(_body.user_id);

                    res.json(
                        generateJSONResponse(
                            "alive_stop_ok",
                            null,
                            _body.command,
                            null
                        )
                    );
                } else if (_body.code == 200) {
                    res.json(generateJSONResponse("error", null, null, null));
                }
            });
            break;

        case "mobile_new":
            if (!checkProperties(["token"], jsonObj)) {
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
                    token: jsonObj["token"],
                },
            };

            request(options, (err, response) => {
                if (response.body.code === 100) {
                    res.json({
                        type: "user_id",
                        id: response.body.user_id,
                    });
                } else {
                    res.status(404).json(
                        generateJSONResponse("error", null, null, null)
                    );
                }
            });

            break;

        case "mb_lock_with_pwd":
            if (!checkProperties(["id", "pwd"], jsonObj)) {
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
                    pwd: jsonObj["pwd"],
                },
            };

            request(options, (err, response) => {
                if (err) {
                    res.status(404).end();
                }
                res.json(
                    generateJSONResponse(
                        "mb_locK_with_pwd_ok",
                        jsonObj["id"],
                        null,
                        null
                    )
                );
            });
            break;

        case "mb_lock_off":
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

            request(options, (err, response) => {
                if (err) {
                    res.status(404).end();
                }
                res.json(
                    generateJSONResponse(
                        "mb_locK_off_ok",
                        jsonObj["id"],
                        null,
                        null
                    )
                );
            });
            break;

        case "mb_camera":
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

            request(options, (err, response) => {
                if (err) {
                    res.status(404).end();
                }
                res.json(
                    generateJSONResponse(
                        "mb_camera_ok",
                        jsonObj["id"],
                        null,
                        null
                    )
                );
            });
            break;

        case "mb_upload":
            /**
             * 1. 데이터베이스에 id를 검색해 Image존재 여부를 확인한다.
             * 2. 확인시 이미지 삭제, 재업로드를 진행, 없으면 그대로 업로드를 한다.
             * 3. 업로드 된 이미지의 이름은 데이터베이스로 id와 함꼐 한번 더 전송된다.
             * 4. 최종적으로 id와 ok 사인을 response한다.
             */
            if (!checkProperties(["id", "img"], jsonObj)) {
                logger.onSendingMsgError("Wrong Properties");
                res.json({
                    type: "error",
                    msg: "Wrong properties",
                });
                return;
            }

            const bufferImgFile = jsonObj["img"];
            const imgName = new Date();
            decode_base64(bufferImgFile, imgName + ".png")
                .then(() => {
                    res.json(
                        generateJSONResponse(
                            "mb_upload_ok",
                            jsonObj["id"],
                            null,
                            null
                        )
                    );
                })
                .catch(() => {
                    res.json({
                        type: "error",
                        msg: "failed to upload the image",
                    });
                });

            break;

        case "mb_download":
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
