var mongoose = require('mongoose');

//Schema 제작
var Schema = mongoose.Schema;
var newUserInfoSchema = new Schema({
  // 요소 지정
  /*
  ip: String, => 접속 IP
  user_id: String, => 발급한 ID
  user_token: String, => token값
  warning_pushed:Boolean, => 인터넷 품질 측정 용도
  abnormally_terminated:Boolean => 비정상적 종료 확인
 */
  ip: String,
  user_id: String,
  user_token: String,
  abnormally_terminated:Boolean
}, {
    // 이름 지정
    collection: 'registered-user-info',
    // versionKey 지정
    versionKey: false
  });

// model입니다. 새로운 객체를 만들어 .save를 호출하면 Schema가 저장됩니다.
var NewUserInfo = mongoose.model('registered-user-info', newUserInfoSchema);

module.exports = NewUserInfo;
