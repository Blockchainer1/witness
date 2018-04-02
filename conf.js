/* jslint node: true */

'use strict';

exports.port = null;
// exports.myUrl = 'wss://mydomain.com/bb';
exports.bServeAsHub = false;
exports.bLight = false;

exports.storage = 'sqlite';


exports.hub = 'test-hub.dagcoin.org/spoon/';
exports.deviceName = 'Witness';
exports.permanent_pairing_secret = 'randomstring';
exports.admin_email = 'admin@example.com';
exports.from_email = 'fromemail@example.com';
exports.control_addresses = ['DEVICE ALLOWED TO CHAT'];
exports.payout_address = 'WHERE THE MONEY CAN BE SENT TO';

exports.bSingleAddress = true;
exports.THRESHOLD_DISTANCE = 50;
exports.MIN_AVAILABLE_WITNESSINGS = 100;

exports.KEYS_FILENAME = 'keys.json';

// Whether to redirect the output stream to a log file
exports.PIPE_OUTPUT_TO_FILE = false;
// Whether to use a password from the configuration file instead of asking it from the user
exports.INTERACT_WITH_USER = false;
// Wallet password. Relevant only in case INTERACT_WITH_USER is false.
exports.WALLET_PASSWORD = 'BSh5COP5ZesCgmZPyPmB'; // Mock password.


console.log('finished witness conf');
