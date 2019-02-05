
const Casino = artifacts.require("Casino");
const DiamondRush = artifacts.require("DiamondRush");
const FastChannel = artifacts.require("FastChannel");
const FastChannelCreator = artifacts.require("FastChannelCreator");
const Fasttoken = artifacts.require("Fasttoken");
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js');

const Web3 = require('web3');


//The following line is required to use timeTravel with web3 v1.x.x
Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;

const w3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545")) // Hardcoded development port


const timeTravel = function (time) {
        return new Promise ((resolve, reject) => {
                w3.currentProvider.sendAsync({
                        jsonrpc: "2.0",
                        method: "evm_increaseTime",
                        params: [time], // 86400 is num seconds in day
                        id: new Date().getTime()
                }, (err, result) => {
                        if (err) {
                                return reject(err);
                        }
                        return resolve(result)
                });
        })
}

const mineBlock = function () {
        return new Promise ((resolve, reject) => {
                w3.currentProvider.sendAsync({
                        jsonrpc: "2.0",
                        method: "evm_mine"
                }, (err, result) => {
                        if (err) {
                                return reject(err);
                        }
                        return resolve(result);
                });
        });
}


contract('Casino', async (accounts) => {

        /// Casino
        let CASINO

        /// FastChannel
        let FASTCHANNEL;

        /// Token
        let FTN;

        /// Owner address
        let OWNER = accounts[0];
        
        /// Player address
        let PLAYER = accounts[1];


        async function isAccountLocked(account) {

                try {
                        await w3.eth.sendTransaction({
                                from: account,
                                to: account,
                                value: 0
                        });
                        return false;
                } catch (err) {
                        return (err.message == "authentication needed: password or unlock");
                }
        }

        async function unlockAccountsIfNeeded() {

                if (isAccountLocked(OWNER)) {
                        await w3.eth.personal.unlockAccount(OWNER, "fasttoken");
                }
                if (isAccountLocked(PLAYER)) {
                        await w3.eth.personal.unlockAccount(PLAYER, "fasttoken");
                }
        }

        before(async() => {

                FTN = await Fasttoken.new(OWNER, { from: OWNER });
                await FTN.transfer(PLAYER, 10000, { from: OWNER });
                CASINO = await Casino.new(FTN.address, { from: OWNER });
                await FTN.transfer(CASINO.address, 10000000, { from: OWNER });
        });

        describe("Casino", async function () {

                it("initial parameters", async function () {

                        assert.equal(await CASINO.token.call(), FTN.address);
                        assert.equal(await CASINO.signerAddr.call(), OWNER);
                        assert.notEqual('0x0000000000000000000000000000000000000000', await CASINO.currentChannelCreator.call());
                        assert.equal(await CASINO.lastWithdraw.call(), 0);
                        assert.equal(await CASINO.isLocked.call(), 0);
                });

                it("locking functionality", async function () {

                        await CASINO.lock();
                        assert.equal(await CASINO.isLocked.call(), 1);
                        await CASINO.unlock();
                        assert.equal(await CASINO.isLocked.call(), 0);
                });

                it("games functionality", async function () {

                        let g = await DiamondRush.new({ from: OWNER });
                        await truffleAssert.fails(CASINO.setGameAvail(g.address, 1, { from: OWNER }));
                        await CASINO.addGame(g.address, { from: OWNER});
                        assert.equal(1, await CASINO.gameAvailable(g.address));
                        await truffleAssert.fails(CASINO.addGame(g.address, { from: OWNER }));
                        let g1 = await DiamondRush.new({ from: OWNER });
                        await truffleAssert.fails(CASINO.addGame(g1.address, { from: accounts[1] }));
                        let gs = await CASINO.getGames();
                        assert.equal(1, gs.length);
                        assert.equal(g.address, gs[0]);
                        await truffleAssert.fails(CASINO.setGameAvail(g.address, 0, { from: OWNER }));
                        await CASINO.setGameAvail(g.address, 2, { from: OWNER });
                        assert.equal(2, await CASINO.gameAvailable(g.address));
                        await CASINO.setGameAvail(g.address, 1, { from: OWNER });
                        assert.equal(1, await CASINO.gameAvailable(g.address));
                        await truffleAssert.fails(CASINO.setGameAvail(g.address, 2, { from: accounts[1] }));
                });

                it("channel creator", async function () {

                        let c = await FastChannelCreator.new({ from: OWNER });
                        await CASINO.setCurrentChannelCreator(c.address,  { from: OWNER });
                        assert.equal(c.address, await CASINO.currentChannelCreator());
                        await truffleAssert.fails(CASINO.setCurrentChannelCreator(c.address,  { from: accounts[1] }));
                });

                it("withdraw functionality", async function () {

                        let l = BigNumber(await CASINO.DAILY_LIMIT());
                        await truffleAssert.fails(CASINO.withdrawCasinoBank(l, { from: accounts[1] }));
                        assert.equal(false, await CASINO.casinoAllowedToWithdraw(l.plus(1)));
                        await truffleAssert.fails(CASINO.withdrawCasinoBank(l.plus(1), { from: OWNER }));
                        let tr = await CASINO.withdrawCasinoBank(l.dividedBy(2), { from: OWNER });
                        let ct = (await web3.eth.getBlock('latest')).timestamp;
                        assert.equal(false, await CASINO.casinoAllowedToWithdraw(1));
                        await truffleAssert.fails(CASINO.withdrawCasinoBank(1, { from: OWNER }));
                        assert.equal(ct, BigNumber(await CASINO.lastWithdraw()).toNumber());
                        await timeTravel(3600 * 12);
                        await mineBlock();
                        assert.equal(false, await CASINO.casinoAllowedToWithdraw(1));
                        await truffleAssert.fails(CASINO.withdrawCasinoBank(1, { from: OWNER }));
                        await timeTravel(3600 * 12 + 1);
                        await mineBlock();
                        CASINO.withdrawCasinoBank(1, { from: OWNER });
                });

                it("channel", async function () {

                        let owner = accounts[2];
                        let result = await CASINO.createChannel({ from: owner });
                        let nc;
                        truffleAssert.eventEmitted(result, 'ChannelCreated', (ev) => {
                                nc = ev.newChannelAddress;
                                return ev.userAddress === owner;
                        });
                        let cs = await CASINO.getChannels();
                        assert.equal(1, cs.length);
                        assert.equal(nc, cs[0]);
                        assert.equal(nc, await CASINO.userToChannel(owner));
                        await truffleAssert.fails(CASINO.createChannel({ from: owner }));
                        assert.equal(true, await CASINO.isValidChannel(nc));
                });
        });
});
