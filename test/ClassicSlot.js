
const ClassicSlot = artifacts.require("DiamondRush");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('ClassicSlot', async (accounts) => {

        let CLASSICSLOT;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./slots/DiamondRush.json'));


        async function mergeSpinRands(r1, r2) {

                assert.equal(r1.length, r2.length);
                assert.equal(r1.length, (await CLASSICSLOT.getReelsLength()).toNumber() + 1);
                var r = [];
                for (var i = 0; i < r1.length - 1; ++i) {
                        let l = await CLASSICSLOT.getReelLength(i);
                        r.push((r1[i] + r2[i]) % l);
                }
                return r;
        }

        function checkMergeSpinRandResult(g, result) {

                assert.equal(g.length, result.length);
                assert.equal(g[0], BigNumber(result[0]).toNumber());
                assert.equal(g[1], BigNumber(result[1]).toNumber());
                assert.equal(g[2], BigNumber(result[2]).toNumber());
                assert.equal(g[3], BigNumber(result[3]).toNumber());
                assert.equal(g[4], BigNumber(result[4]).toNumber());
        }

        function checkDoStepResult(g, result) {

                assert.equal(g[1][0], BigNumber(result[1][0]).toNumber());
                assert.equal(g[1][1], BigNumber(result[1][1]).toNumber());
                assert.equal(g[1][2], BigNumber(result[1][2]).toNumber());
                assert.equal(g[1][3], BigNumber(result[1][3]).toNumber());
                assert.equal(g[1][4], BigNumber(result[1][4]).toNumber());
                assert.equal(g[1][5], BigNumber(result[1][5]).toNumber());
                assert.equal(g[1][6], BigNumber(result[1][6]).toNumber());
                assert.equal(g[1][7], BigNumber(result[1][7]).toNumber());
        }

        async function addLines() {

                for (var i = 0; i < SLOT.lines.length; ++i) {
                        await CLASSICSLOT.addLine(SLOT.lines[i], { from: OWNER });
                }
        }

        async function addWins() {

                for (var i = 0; i < SLOT.wins.length; ++i) {
                        await CLASSICSLOT.addWin(SLOT.wins[i], { from: OWNER });
                }
        }

        async function addReels() {

                for (var i = 0; i < SLOT.reels.length; ++i) {
                        await CLASSICSLOT.addReel(SLOT.reels[i], { from: OWNER });
                }
        }

        before(async() => {

                CLASSICSLOT = await ClassicSlot.new({ from: OWNER });
                await addReels();
                await addWins();
                await addLines();
        });

        describe("ClassicSlot Checking doStep", async function () {

                // state[0] - 0->unInit, 1->sha1, 2->r2, 3->r1
                // state[1] - 0->unInit, 1->normal, 2->doubling
                // state[2] - bet
                // state[3] - line
                // state[4] - choice
                // state[5] - multiplier
                // state[6] - lastWin
                // state[7] - number of freespins

                // action[0] - 0->invalid, 1->sha1, 2->r2, 3->r1,
                // action[1] - 0->invalid, 1->spin, 2->doubling
                // action[2] - bet
                // action[3] - line
                // action[4] - choice

                var maxWin;
                var bet;
                var line;
                var choice;
                var result;
                var win = 0;

                before(async() => {

                        maxWin = BigNumber(await CLASSICSLOT.WIN_MAX.call());
                        bet = 1;
                        line = 5;
                        choice = 2;
                });

                it("spin sha1", async function () {

                        result = await CLASSICSLOT.doStep([0, 0, 0, 0, 0, 0, 0, 0], [1, 1, bet, line, 0], [], []); // Spin sha1
                        checkDoStepResult([BigNumber(maxWin).minus(bet * line), [1, 1, bet, line, 0, 0, 0, 0]], result);

                        result = await CLASSICSLOT.doStep([0, 0, 0, 0, 0, 0, 5, 0], [1, 1, bet, line, 0], [], []); // Spin sha1
                        checkDoStepResult([BigNumber(maxWin).minus(bet * line), [1, 1, bet, line, 0, 0, 0, 0]], result);
                });

                it("spin r2", async function () {

                        result = await CLASSICSLOT.doStep(result[1], [2, 1, 0, 0, 0], [], []);
                        checkDoStepResult([BigNumber(-maxWin), [2, 1, bet, line, 0, 0, 0, 0]], result);
                });

                it("spin r1", async function () {

                        let rand = [0, 0, 0, 0, 0, 0, 0];
                        result = await CLASSICSLOT.doStep(result[1], [3, 1, 0, 0, 0], rand, rand);
                        win = (await CLASSICSLOT.getSpinResult(bet, line, rand.slice(0, rand.length - 1), 0))[0];
                        checkDoStepResult([BigNumber(win), [3, 0, bet, line, 0, 0, BigNumber(win).toNumber(), 0]], result);
                });

                it("doubling sha1", async function () {

                        result = await CLASSICSLOT.doStep(result[1], [1, 2, 0, 0, choice], [], []);
                        checkDoStepResult([BigNumber(win), [1, 2, 1, 5, choice, 0, BigNumber(win), 0]], result);
                });

                it("doubling r2", async function () {

                        result = await CLASSICSLOT.doStep(result[1], [2, 2, 0, 0, 0], [], []);
                        checkDoStepResult([BigNumber(win).multipliedBy(-2), [2, 2, 1, 5, choice, 0, BigNumber(win), 0]], result);
                });

                it("doubling r1", async function () {

                        let doubleWin = await CLASSICSLOT.getDoublingResult(choice, BigNumber(win), 1);
                        result = await CLASSICSLOT.doStep(result[1], [3, 2, 0, 0, 0], [1, 0], [0, 0]);
                        checkDoStepResult([BigNumber(doubleWin), [3, 0, 1, 5, 0, 0, BigNumber(doubleWin), 0]], result);
                });

                it("should fail with incorrect values", async function () {

                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [0, 0, 1, 5, 0, 0], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [1, 0, 1, 5, 0], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [2, 0, 1, 5, 0], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [], []));
                        await truffleAssert.fails(CLASSICSLOT.doStep([2, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 5, 0], [], []));
                });
        });

        /*
        describe("ClassicSlot Checking mergeSpinRands", async function () {

                it("merges rands correctly", async function () {

                        for (var i = 0; i < 100; ++i) {
                                let r1 = [i, i + 1, i + 2, i + 3, i + 4, i + 5];
                                let r2 = [i, i, i, i, i, i];
                                let result = await CLASSICSLOT.mergeSpinRands(r1, r2);
                                let golden = await mergeSpinRands(r1, r2);
                                checkMergeSpinRandResult(golden, result);
                        }
                });

                it("should fail merging with incorrect values", async function () {

                        await truffleAssert.fails(CLASSICSLOT.mergeSpinRands([0, 0, 0, 0, 0], [0, 0, 0, 0, 0]));
                        await truffleAssert.fails(CLASSICSLOT.mergeSpinRands([0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]));
                });
        });

        describe("ClassicSlot Checking mergeDoublingRands", async function () {

                it("merges rands correctly", async function () {

                        let result = await CLASSICSLOT.mergeDoublingRands([0, 0], [0, 0]);
                        assert.equal(0, BigNumber(result).toNumber());

                        result = await CLASSICSLOT.mergeDoublingRands([0, 0], [1, 0]);
                        assert.equal(1, BigNumber(result).toNumber());

                        result = await CLASSICSLOT.mergeDoublingRands([1, 0], [0, 0]);
                        assert.equal(1, BigNumber(result).toNumber());

                        result = await CLASSICSLOT.mergeDoublingRands([1, 0], [1, 0]);
                        assert.equal(0, BigNumber(result).toNumber());
                });

                it("should fail merging with incorrect values", async function () {

                        await truffleAssert.fails(CLASSICSLOT.mergeDoublingRands([0], [0]));
                        await truffleAssert.fails(CLASSICSLOT.mergeDoublingRands([0, 0, 0], [0, 0, 0]));
                });
        });
        */
});
