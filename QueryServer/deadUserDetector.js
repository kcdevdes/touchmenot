var request = require('request');
var logger = require('./logger');

logger.onSendingMsgInfo('Dead User Detector started');

// FCM Server Key입니다.
let SERVER_API_KEY = 'AAAAJ2I8RAY:APA91bEyMgJMcegPqB7pWQyeQvY_hMvD5TpJGAu6QIypa6S3Lzmd2NeFFucG_fNuifbOe_5dg3ao921ljJFFq1-NVmr3dGC8TwylfZVNFgqCA48w2-GrBaIg76dYStc9PaRnfcHZZe_1';

module.exports = function() {
  try {
    checkUserAlive();

    // User가 살아있는지 확인하는 역할을 실행합니다.
    function checkUserAlive() {
      var options = {
        url: 'http://localhost:14000',
        method: 'POST',
        json: {
          type: "_QS_dead_user_check_"
        }
      };
      request(options, (err, res, body) => {
        // 성공적으로 받았을 시 실행되는 처리 구문입니다.
        if (!err && res.statusCode === 200 && body.length !== 0) {
          logger.onSendingMsgInfo('Detected_Dead User' + JSON.stringify(body));
          // 해당 함수로 body 결과를 보내게 됩니다.
          sendFirebasePush(body);
        } else {
          // 유저가 죽지 않았다면 Error를 발생시킵니다.
          //logger.onSendingMsgError('Error_No Dead User');
        }
      });
    }

    // Firebase로 토큰값을 보냅니다.
    function sendFirebasePush(data) {
      // data가 null이면 null을 반환하고 return합니다.
      if (data === null) {
        reject('Error_NullArgs');
        return;
      }

      for (var i = 0; i < data.length; i++) {
        // firebase로 전송하는 규격입니다.
        var push = {
          url: 'https://fcm.googleapis.com/fcm/send',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key=' + SERVER_API_KEY
          },
          method: 'POST',
          json: {
            "data": {
              "warning": "Warning_INTERNET_DEAD",
              "token": data[i]['user_token']
            },
            "android": {
              "priority": "high",
              "TTL": "4500"
            },
            "webpush": {
              "headers": {
                "Urgency": "high",
                "TTL": "4500"
              }
            },
            "to": data[i]['user_token']
          }
        };

        request(push, (err, res, body) => {
          if (!err && res.statusCode === 200) {
            // console.log('Push OK');
            logger.onSendingMsgInfo(`SentPushMsgToFCM`);
          } else {
            logger.onSendingMsgError('Error_CannotConnectFCM');
          }
        });
      }

      return true;
    }
  } catch (err) {
    logger.onSendingMsgError(err);
  }
}
