const colors = require("colors");
const moment = require("moment");

const onStart = () => {
    console.log(
        colors.yellow(moment().format("YYYYMMMMDo, h:mm:ss a [ ]")) +
            "Server Started"
    );
};

const onSendingMsgInfo = (msg) => {
    console.log(
        colors.yellow(moment().format("YYYYMMMMDo, h:mm:ss a [ ]")) +
            colors.cyan("INFO : ") +
            msg
    );
};

const onSendingMsgError = (msg) => {
    console.log(
        colors.yellow(moment().format("YYYYMMMMDo, h:mm:ss a [ ]")) +
            colors.magenta("Error : ") +
            msg
    );
};

module.exports = {
    onStart: onStart,
    onSendingMsgInfo: onSendingMsgInfo,
    onSendingMsgError: onSendingMsgError,
};
