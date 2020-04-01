
const HiLo = artifacts.require("HiLo");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('HiLo', async (accounts) => {

        let HILO;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./hilo/HiLo.json'));


        async function addWins() {

                await HILO.addWin([0, 1140, 570, 380, 285, 228, 190, 163, 143, 127, 114, 104, 100], { from: OWNER });
                await HILO.addWin([100, 104, 114, 127, 143, 163, 190, 228, 285, 380, 570, 1140, 0], { from: OWNER });
        }

        before(async() => {

                console.log(0);
                HILO = await HiLo.new({ from: OWNER });
                await addWins();
                console.log(1);
        });

        describe("HiLo", async function () {

                it("doStep", async function () {

                        let STATE = (await HILO.doStep(["2", "2", "1", "6", "190"], [ '1', '2', '1', '1' ], [], []))[1]; // Spin sha1
                        console.log(STATE);
                });
        });
});
