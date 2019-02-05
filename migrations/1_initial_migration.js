
var Migrations = artifacts.require("Migrations");
var truffle = require('../truffle.js');
const Web3 = require('web3');

function unlockAccount(network) {

        let d = '-fork';
        if (d === network.slice(network.length - d.length)) {
                network = network.slice(0, network.length - d.length);
        }
        var host = truffle.networks[network].host;
        var port = truffle.networks[network].port;
        var account = truffle.networks[network].from;
        const web3 = new Web3(new Web3.providers.HttpProvider('http://' + host + ':' + port.toString()))
        web3.eth.personal.unlockAccount(account, 'fasttoken');
}

module.exports = function(deployer, network, accounts) {

        unlockAccount(network);

        // Deploy the Migrations contract as our only task
        deployer.deploy(Migrations);
};
