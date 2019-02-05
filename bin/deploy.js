
var argv = require('minimist')(process.argv.slice(2));
var slot = require('./slot.js');

var truffle = require('../truffle.js');
const Web3 = require('web3');


function unlockAccount(network) {

        var host = truffle.networks[network].host;
        var port = truffle.networks[network].port;
        var account = truffle.networks[network].from;
        const web3 = new Web3(new Web3.providers.HttpProvider('http://' + host + ':' + port.toString()))
        web3.eth.personal.unlockAccount(account, 'fasttoken');
}

async function start(argv) {

        if (! argv.network) {
                argv.network = 'development';
        }
        unlockAccount(argv.network);
        slot.init(argv.network);
}

start(argv);
