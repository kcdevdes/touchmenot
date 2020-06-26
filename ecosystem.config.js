module.exports = {
    apps: [{
        name: "CT-S",
        script: "./ControllerServer/bin/www",

        log_data_format : "YYYY-MM-DD HH:mm Z",
        error_file : "./.pm2/logs/ControllerServer_err.log",
        out_file : "./.pm2/logs/ControllerServer_out.log",
        env: {
            "NODE_ENV": "development",
	    "watch" : true
        },
        env_production: {
	    "PORT" : 12000,
            "NODE_ENV": "production",
	    "watch" : false
        }
    }, {
        name: "DB-S",
        script: "./DatabaseServer/bin/www",

        log_data_format : "YYYY-MM-DD HH:mm Z",
        error_file : "./.pm2/logs/DatabaseServer_err.log",
        out_file : "./.pm2/logs/DatabaseServer_out.log",
        env: {
            "NODE_ENV": "development",
	    "watch" : true
        },
        env_production: {
	    "PORT" : 14000,
            "NODE_ENV": "production",
 	    "watch" : false
        }
    }, {
        name: "QR-S",
        script: "./QueryServer/bin/www",

        log_data_format : "YYYY-MM-DD HH:mm Z",
        error_file : "./.pm2/logs/QueryServer_err.log",
        out_file : "./.pm2/logs/QueryServer_out.log",
        env: {
            "NODE_ENV": "development",
            "watch" : true
        },
        env_production: {
	    "PORT" : 16000,
            "NODE_ENV": "production",
  	    "watch" : false
        }
    }]
}
