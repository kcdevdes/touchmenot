var mongoose = require("mongoose");
var moment = require("moment");

//Schema 제작
var Schema = mongoose.Schema;
var newAliveUserInfoSchema = new Schema(
    {
        // 요소 지정
        /*
  user_id : String => 발급한 ID값 입니다.
  user_token : String => Token
  renewed_date : Date => 시간입니다.
  is_warning_pushed : Boolean => 7초간 갱신이 이루어지지 않아 push가 날아갈 때 true로 변환됩니다.
  (1. 7초간 갱신이 이루어지지 않으면 경고를 발생합니다.)
  (2. 300초간 갱신이 이루어지지 않고 is_warning_pushed가 true이면 자동 삭제합니다.)
  */
        user_id: String,
        user_token: String,
        renewal_time: {
            type: Date,
            default: Date.now(),
        },
        is_warning_pushed: Boolean,
        command: String,
        pwd: String,
        img: String,
    },
    {
        // 이름 지정
        collection: "alive-user-info",
        // versionKey 지정
        versionKey: false,
    }
);

// model입니다. 새로운 객체를 만들어 .save를 호출하면 Schema가 저장됩니다.
var AliveUserInfo = mongoose.model("alive-user-info", newAliveUserInfoSchema);

module.exports = AliveUserInfo;
