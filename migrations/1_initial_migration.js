
const Migrations = artifacts.require("Migrations");
const truffle = require('../truffle.js');
const Web3 = require('web3');

function unlockAccount(network) {

        const d = '-fork';
        if (d === network.slice(network.length - d.length)) {
                network = network.slice(0, network.length - d.length);
        }
        const host = truffle.networks[network].host;
        const port = truffle.networks[network].port;
        const account = truffle.networks[network].from;
        const web3 = new Web3(new Web3.providers.HttpProvider('http://' + host + ':' + port.toString()))
        web3.eth.personal.unlockAccount(account, 'fasttoken');
}

module.exports = async function(deployer, network, accounts) {

        unlockAccount(network);

        // Deploy the Migrations contract as our only task
        deployer.deploy(Migrations);
};
