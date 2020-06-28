/**
@ developer : Kevin Choi
@ date : July 19th 2019, Friday
@ URL : http://52.79.243.39:14000/
@ description :
This server receives JSON files from Controller Server throughout
localhost URL.
It processes JSON files to save on MongoDB.
Also It finds LostUser who has not updated a Date Attribute for seven
seconds and DeadUser who has not updated a Date Attribute for five minutes.
NOTE : It allows to connect only LOCALHOST connections and
denies another connections.
*/

var express = require("express");
var mongoose = require("mongoose");
var moment = require("moment");
var request = require("request");
var logger = require("./logger");
var router = express.Router();
var dotenv = require("dotenv");
var path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

const DB_ADMIN = process.env.DB_ADMIN;
const DB_PASSWORD = process.env.DB_PASSWORD;

const SERVER_API_KEY =
    "AAAAJ2I8RAY:APA91bEyMgJMcegPqB7pWQyeQvY_hMvD5TpJGAu6QIypa6S3Lzmd2NeFFucG_fNuifbOe_5dg3ao921ljJFFq1-NVmr3dGC8TwylfZVNFgqCA48w2-GrBaIg76dYStc9PaRnfcHZZe_1";

// Logger를 시작합니다.
logger.onStart();

/* DB Connection */
var db = mongoose.connection;
// DB서버 연결 오류 처리
db.on("error", () => {
    logger.onSendingMsgError("Not available DB Server");
});
// 연결 성공 처리
db.once("open", () => {
    logger.onSendingMsgInfo("Connected to mongod Server");
});
// mongodb 연결
var url = `mongodb://localhost:27017/user_info`;
mongoose.connect(url, {
    auth: {
        user: DB_ADMIN,
        password: DB_PASSWORD,
    },
    authSource: "admin",
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
// 내부 라이브러리 모델 파일 호출
var RegisteredUserInfo = require("../lib/model/registered-user-info");
var AliveUserInfo = require("../lib/model/alive-user-info");
const { json } = require("express");
mongoose.set("useFindAndModify", false);

/* function
dict에 탐색을 원하는 모든 요소를 dictionary값으로 넣어서,
json에 모든 컴포넌트가 존재하는 지 확인한 후,
일치 시 true를 반환합니다.
*/
function check_properties(dict, json) {
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
    } catch (e) {
        //console.log('Not JSON');
        logger.onSendingMsgError("Not JSON");
        return false;
    }
    return true;
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

/* POST JSON upload */
router.post("/", (req, res, next) => {
    /* 접속 정보 */
    const IP = getUserIP(req);

    // 내부 아이피 아님 상종 안함.
    if (IP !== "127.0.0.1") {
        res.json({
            type: "error",
            msg: "access denied",
        });
        res.end();
        return;
    }

    /** 파일 입력 **/
    // body는 req의 본체로 JSON파일을 받습니다.
    var inputItem = req.body;
    var jsonObj = null;
    // 유효한 JSON 파일인지 겁사합니다.
    if (isJSON(inputItem)) {
        jsonObj = JSON.parse(JSON.stringify(inputItem));
    } else {
        res.json({
            code: 200,
            msg: "Not JSON",
        });
        return;
    }

    /** 저장 **/

    // type 속성 존재 확인
    if (!check_properties(["type"], jsonObj)) {
        logger.onSendingMsgError("Cannot find Type");
        res.json({
            code: 200,
            msg: "Cannot Find Type",
        });
        return;
    }

    /* 타입 분류 */
    switch (jsonObj["type"]) {
        ////////////////Controller Server Processings////////////

        // 새로운 유저 등록
        case "new":
            // 유효 타입 검사
            if (
                !check_properties(
                    ["ip", "id", "token", "abnormally_terminated"],
                    jsonObj
                )
            ) {
                logger.onSendingMsgError("Wrong Properties");
                res.json({
                    code: 200,
                    msg: "Wrong properties",
                });
                return;
            }

            // 데이터 저장
            var insertDbData = new RegisteredUserInfo({
                ip: jsonObj["ip"],
                user_id: jsonObj["id"],
                user_token: jsonObj["token"],
                abnormally_terminated: jsonObj["abnormally_terminated"],
            });
            insertDbData.save((err, data) => {
                if (!err) {
                    logger.onSendingMsgInfo("NEW : New User Data saved");
                    // 결과 반환
                    res.json({
                        code: 100,
                        msg: "database-server",
                    });
                } else {
                    logger.onSendingMsgError("NEW : Failed to Save User Data");
                    res.json({
                        code: 200,
                        msg: "Failed to Save User Data",
                    });
                }
            });
            break;

        // 활성 사용자 등록
        case "alive":
            // 유효 타입 검사
            if (!check_properties(["id"], jsonObj)) {
                res.json({
                    code: 200,
                    msg: "Wrong Properties",
                });
                return;
            }

            logger.onSendingMsgInfo("ALIVE : ID - " + jsonObj["id"]);

            // AliveUserInfo에서 검색 및 update를 시도합니다.
            AliveUserInfo.findOneAndUpdate(
                {
                    user_id: jsonObj["id"],
                    is_warning_pushed: false,
                },
                {
                    renewal_time: Date.now(),
                },
                function (err, body) {
                    // 에러가 없고 , res가 null이 아니면 성공json을 response합니다.
                    if (!err && body !== null) {
                        logger.onSendingMsgInfo(
                            "ALIVE : ID data already exists. The time has been changed"
                        );
                        // res.json({
                        //     psnum : 100,
                        //     msg : "ok",
                        // })
                        res.json({
                            code: 100,
                            user_id: body.user_id,
                            command: body.command,
                            pwd: body.pwd,
                        });
                    } else if (body === null) {
                        // 만약 해당하는 조건이 검색되지 않는다면 is_warning_pushed이
                        // true인지 (5초 이내로 업데이트 되지 않았단 플래그) 확인하고, 이후
                        // 발견되면 fcm push와 함께 false로 다시 업데이트를 해줍니다.
                        AliveUserInfo.findOneAndUpdate(
                            {
                                user_id: jsonObj["id"],
                                is_warning_pushed: true,
                            },
                            {
                                renewal_time: Date.now(),
                                is_warning_pushed: false,
                            },
                            (err, notice) => {
                                if (!err && notice !== null) {
                                    // firebase로 전송하는 규격입니다.
                                    logger.onSendingMsgInfo(
                                        "ALIVE : Reconnected User - " +
                                            jsonObj["id"]
                                    );
                                    logger.onSendingMsgInfo(
                                        JSON.stringify(notice)
                                    );
                                    var push = {
                                        url:
                                            "https://fcm.googleapis.com/fcm/send",
                                        headers: {
                                            "Content-Type": "application/json",
                                            Authorization:
                                                "key=" + SERVER_API_KEY,
                                        },
                                        method: "POST",
                                        json: {
                                            data: {
                                                warning:
                                                    "Warning_INTERNET_RECONNECTED",
                                                token: notice["user_token"],
                                            },
                                            android: {
                                                priority: "high",
                                                TTL: "4500",
                                            },
                                            webpush: {
                                                headers: {
                                                    Urgency: "high",
                                                    TTL: "4500",
                                                },
                                            },
                                            to: notice["user_token"],
                                        },
                                    };

                                    request(push, (err, res, body) => {
                                        if (!err && res.statusCode === 200) {
                                            // console.log('Push OK');
                                            logger.onSendingMsgInfo(
                                                `ALIVE : SentPushMsgToFCM`
                                            );
                                        } else {
                                            logger.onSendingMsgError(
                                                "ALIVE : Error_CannotConnectFCM"
                                            );
                                        }
                                    });

                                    // res.json({
                                    //     psnum: 100,
                                    //     msg: "database-server",
                                    // });

                                    res.json({
                                        code: 100,
                                        user_id: notice.user_id,
                                        command: notice.command,
                                        pwd: notice.pwd,
                                    });

                                    // 아닐시 RegisteredUserInfo에서 token값이 존재하는 지 확인합니다.
                                    // token이 존재치 않으면 없는 token이란 실패 메세지를 리턴합니다.
                                } else {
                                    RegisteredUserInfo.find(
                                        {
                                            user_id: {
                                                $in: jsonObj["id"],
                                            },
                                        },
                                        {
                                            _id: 0,
                                            user_token: 1,
                                        },
                                        (err, notice) => {
                                            // 데이터가 존재할 시 처리되는 로직입니다.
                                            // AliveUserInfo 데이터 스키마에 token값과 id를 첨부합니다.
                                            if (!err && notice.length !== 0) {
                                                // 데이터 저장
                                                var insertDbData = new AliveUserInfo(
                                                    {
                                                        user_id: jsonObj["id"],
                                                        user_token:
                                                            notice[0][
                                                                "user_token"
                                                            ],
                                                        renewal_time: Date.now(),
                                                        is_warning_pushed: false,
                                                        command: "",
                                                        pwd: "",
                                                    }
                                                );
                                                insertDbData.save(
                                                    (err, data) => {
                                                        if (err) {
                                                            logger.onSendingMsgError(
                                                                "ALIVE : Error to save on DB"
                                                            );
                                                            return;
                                                        } else {
                                                            logger.onSendingMsgInfo(
                                                                "ALIVE : AliveUserInfo User Data saved"
                                                            );
                                                            // res.json({
                                                            //     psnum: 100,
                                                            //     msg:
                                                            //         "database-server",
                                                            // });

                                                            res.json({
                                                                code: 100,
                                                                user_id:
                                                                    data.user_id,
                                                                command:
                                                                    data.command,
                                                                pwd: data.pwd,
                                                            });
                                                        }
                                                    }
                                                );
                                                // 데이터가 존재하지 않을 시 보내지는 로직과 JSON 구문입니다.
                                            } else {
                                                logger.onSendingMsgError(
                                                    "ALIVE : No Token depends on this ID"
                                                );
                                                res.json({
                                                    code: 200,
                                                    msg: "Failed to Save",
                                                });
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                }
            );

            break;

        // 활성 사용자 해제
        case "alive_stop":
            // 유효 타입 검사
            if (!check_properties(["id"], jsonObj)) {
                res.json({
                    code: 200,
                    msg: "Wrong Properties",
                });
                return;
            }

            AliveUserInfo.findOneAndDelete(
                {
                    user_id: jsonObj["id"],
                },
                (err, doc) => {
                    if (err) {
                        logger.onSendingMsgError(
                            "ALIVE_STOP_FROM_ALIVE_LIST : " + err
                        );
                        res.status(400).json({
                            code: 200,
                            msg: "Id data has already deleted.",
                        });
                    } else if (doc != null) {
                        logger.onSendingMsgInfo(
                            "ALIVE_STOP_FROM_ALIVE_LIST : Deleted successfully"
                        );
                        // res.json({
                        //     psnum: 100,
                        //     msg: "database-server",
                        // });

                        // DELETE가 DB에 이미 적용되어 삭제되어 있으면
                        // 각 property가 존재치 않아 Error가 발생하기 때문
                        res.json({
                            code: 100,
                            user_id: doc.user_id,
                            command: doc.command,
                        });
                    } else {
                        logger.onSendingMsgInfo("There is no data");
                        res.json({
                            code: 200,
                            msg: "already deleted",
                        });
                    }

                    res.end();
                }
            );
            break;

        //////////////////
        // 추가된 내용 /////
        //////////////////

        case "mb_lock_with_pwd":
            // 유효 타입 검사
            if (!check_properties(["id", "pwd"], jsonObj)) {
                res.json({
                    code: 200,
                    msg: "Wrong Properties",
                });
                return;
            }
            // id를 기반으로 Document검색
            // Document내에 command에 명령어 삽입
            AliveUserInfo.findOneAndUpdate(
                { user_id: jsonObj["id"] },
                {
                    command: "MobileLockOn",
                    pwd: jsonObj["pwd"],
                },
                (err, data) => {
                    if (err) {
                        logger.onSendingMsgError(err);
                    } else {
                        res.json({
                            psnum: 100,
                            msg: "database-server",
                        });
                    }
                }
            );
            break;

        case "mb_lock_off":
            // 유효 타입 검사
            if (!check_properties(["id"], jsonObj)) {
                res.json({
                    psnum: 200,
                    msg: "Wrong Properties",
                });
                return;
            }
            // 동일
            AliveUserInfo.findOneAndUpdate(
                { user_id: jsonObj["id"] },
                { command: "MobileLockOff" },
                (err, data) => {
                    if (err) {
                        logger.onSendingMsgError(err);
                    } else {
                        res.json({
                            psnum: 100,
                            msg: "database-server",
                        });
                    }
                }
            );
            break;

        case "mb_camera":
            // 유효 타입 검사
            if (!check_properties(["id"], jsonObj)) {
                res.json({
                    psnum: 200,
                    msg: "Wrong Properties",
                });
                return;
            }
            // camera 명령어로 저장
            AliveUserInfo.findOneAndUpdate(
                { user_id: jsonObj["id"] },
                { command: "MobileCamera" },
                (err, data) => {
                    if (err) {
                        logger.onSendingMsgError(err);
                    } else {
                        res.json({
                            psnum: 100,
                            msg: "database-server",
                        });
                    }
                }
            );
            break;

        case "mb_delete":
            // 유효 타입 검사
            if (!check_properties(["id"], jsonObj)) {
                res.json({
                    psnum: 200,
                    msg: "Wrong Properties",
                });
                return;
            }
            // command의 value를 없애버린다.
            AliveUserInfo.findOneAndUpdate(
                { user_id: jsonObj["id"] },
                { command: "", pwd: "" },
                (err, data) => {
                    if (err) {
                        logger.onSendingMsgError(err);
                    } else {
                        res.json({
                            psnum: 100,
                            msg: "database-server",
                        });
                    }
                }
            );
            break;
        ////////////////Query Server Processings////////////////

        // Query서버에서의 lostUser를 찾고 그에 대한 토큰값을 넘겨줍니다.
        // 내부적으로 flag 설정까지 마칩니다.
        case "_QS_lost_user_check_":
            // 7000ms이내에 갱신이 안되고, is_warning_pushed 항목이
            // false인 id목록을 응답합니다.
            function getLostUser(callback) {
                // lostUser를 담는 항목입니다.
                var lostUserIDArray = new Array();

                AliveUserInfo.find(
                    {
                        renewal_time: {
                            $lte: Date.now() - 7000,
                        },
                        is_warning_pushed: false,
                    },
                    {
                        _id: 0,
                        user_id: 1,
                        user_token: 1,
                    },
                    (err, notice) => {
                        if (err) return res.send(err);
                        else {
                            // 잃은 유저를 모두 array에 push 합니다.
                            if (notice.length !== 0) {
                                for (var i = 0; i < notice.length; i++) {
                                    lostUserIDArray.push(notice[i]["user_id"]);
                                    logger.onSendingMsgInfo(
                                        "_QS_lost_user_check_" +
                                            JSON.stringify(notice)
                                    );
                                }
                            }
                            callback(lostUserIDArray);
                            res.json(notice);
                        }
                    }
                );
            }

            getLostUser((lostUserIDArray) => {
                if (lostUserIDArray.length === 0) {
                    return;
                } else {
                    // is_warning_pushed 항목을 true로 변환하여 주는 로직입니다.
                    AliveUserInfo.updateMany(
                        {
                            renewal_time: {
                                $lte: Date.now() - 5000,
                            },
                        },
                        {
                            is_warning_pushed: true,
                        },
                        (err, body) => {
                            if (err) {
                                logger.onSendingMsgError(
                                    "_QS_lost_user_check_ : Failed to update AliveUserInfo" +
                                        err
                                );
                                return;
                            } else {
                                logger.onSendingMsgInfo(
                                    "_QS_lost_user_check_ : AliveUserInfo update done"
                                );
                            }
                        }
                    );
                }
            });

            break;

        // Query서버에서의 deadUser를 찾고 그에 대한 토큰값을 넘겨줍니다.
        // 내부적으로 flag 설정, 삭제까지 마칩니다.
        case "_QS_dead_user_check_":
            // 300000ms (5m) 이내에 갱신이 안되고 is_warning_pushed 항목이
            // true인 id목록을 응답합니다.
            function getDeadUser(callback) {
                // lostUser를 담는 항목입니다.
                var deadUserIDArray = new Array();

                AliveUserInfo.find(
                    {
                        renewal_time: {
                            $lte: Date.now() - 300000,
                        },
                        is_warning_pushed: true,
                    },
                    {
                        _id: 0,
                        user_id: 1,
                        user_token: 1,
                    },
                    (err, notice) => {
                        if (err) return res.send(err);
                        else {
                            // 잃은 유저를 모두 array에 push 합니다.
                            if (notice.length !== 0) {
                                for (var i = 0; i < notice.length; i++) {
                                    deadUserIDArray.push(notice[i]["user_id"]);
                                }
                                logger.onSendingMsgInfo(
                                    "_QS_dead_user_check_: " +
                                        JSON.stringify(notice)
                                );
                            }
                            callback(deadUserIDArray);
                            res.json(notice);
                        }
                    }
                );
            }

            getDeadUser((deadUserIDArray) => {
                if (deadUserIDArray.length === 0) {
                    return;
                } else {
                    // deadUser를 alive_user에서 지워주게 합니다.
                    AliveUserInfo.deleteMany(
                        {
                            renewal_time: {
                                $lte: Date.now() - 5000,
                            },
                        },
                        {
                            is_warning_pushed: true,
                        },
                        (err, body) => {
                            if (err) {
                                logger.onSendingMsgError(
                                    "_QS_lost_user_check_ : Failed to delete AliveUserInfo" +
                                        err
                                );
                                return;
                            } else {
                                logger.onSendingMsgInfo(
                                    "_QS_lost_user_check_ : Deleted successfully"
                                );
                            }
                        }
                    );
                }

                // RegisteredUserInfo의 abnormally_terminated를 업데이트 하는 항목입니다.
                RegisteredUserInfo.updateMany(
                    {
                        user_id: deadUserIDArray,
                    },
                    {
                        abnormally_terminated: true,
                    },
                    (err, body) => {
                        if (err) {
                            logger.onSendingMsgError(
                                "_QS_dead_user_check_ : Failed to update RegisteredUserInfo" +
                                    err
                            );
                            return;
                        } else {
                            logger.onSendingMsgInfo(
                                "_QS_dead_user_check_ : RegisteredUserInfo update done"
                            );
                        }
                    }
                );
            });

            break;

        default:
            res.json({
                psnum: 200,
                msg: "Wrong Type",
            });
    }
});

module.exports = router;
