
const DiamondRush = artifacts.require("DiamondRush");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('DiamondRush', async (accounts) => {

        let DIAMONDRUSH;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./slots/DiamondRush.json'));


        async function mergeSpinRands(r1, r2) {

                assert.equal(r1.length, r2.length);
                assert.equal(r1.length, (await DIAMONDRUSH.getReelsLength()).toNumber() + 1);
                var r = [];
                for (var i = 0; i < r1.length - 1; ++i) {
                        let l = await DIAMONDRUSH.getReelLength(i);
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
        }

        async function addLines() {

                for (var i = 0; i < SLOT.lines.length; ++i) {
                        await DIAMONDRUSH.addLine(SLOT.lines[i], { from: OWNER });
                }
        }

        async function addWins() {

                for (var i = 0; i < SLOT.wins.length; ++i) {
                        await DIAMONDRUSH.addWin(SLOT.wins[i], { from: OWNER });
                }
        }

        async function addReels() {

                for (var i = 0; i < SLOT.reels.length; ++i) {
                        await DIAMONDRUSH.addReel(SLOT.reels[i], { from: OWNER });
                }
        }

        async function spin(bet, line, win, rand, cards, number) {

                try {
                        console.log("spin(" + bet.toString() + ", " + line.toString()
                                                        + ", [" + rand.join() + "]) = "
                                                        + win.toString() + ", " + (number + 1).toString());
                        assert.equal(win, (await DIAMONDRUSH.getSpinResult(bet, line, rand))[0].toNumber());
                        //console.log('gas cost -', await DIAMONDRUSH.getSpinResult.estimateGas(bet, line, rand));
                } catch (err) {
                        throw new Error(JSON.stringify({error: err,
                                                        number: number,
                                                        cards: cards,
                                                        spin: { bet: bet, line: line, rand: rand } }));
                }
        };

        before(async() => {

                DIAMONDRUSH = await DiamondRush.new({ from: OWNER });
                await addReels();
                await addWins();
                await addLines();
        });

        describe("DiamondRush initial parameters", async function () {

                it("DiamondRush - REELSCOUNT, WINSCOUNT, LINESCOUNT, wildCard, scatSymbol", async function () {

                        assert.equal(await DIAMONDRUSH.REELS_COUNT.call(), 5);
                        assert.equal(await DIAMONDRUSH.WINS_COUNT.call(), 12);
                        assert.equal(await DIAMONDRUSH.LINES_COUNT.call(), 5);
                        assert.equal(await DIAMONDRUSH.wildCard.call(), 1);
                        assert.equal(await DIAMONDRUSH.scatSymbol.call(), 11);
                        assert.equal(await DIAMONDRUSH.imageSize.call(), 3);
                });
        });

        describe("DiamondRush result of 1000 spins", async function () {

                it("1000 spins", async function () {

                        let data = JSON.parse(fs.readFileSync('test/spin.out'));
                        for (var i = 0; i < data.length; ++i) {
                                await spin(1, data[i].linesCount, data[i].win, data[i].reelStops, data[i].cards, i);
                        }
                });
        });

        describe("DiamondRush Checking doStep", async function () {

                // state[0] - 0->unInit, 1->sha1, 2->r2, 3->r1
                // state[1] - 0->unInit, 1->normal, 2->doubling
                // state[2] - bet
                // state[3] - line
                // state[4] - choice
                // state[5] - lastWin
                // state[6] - number of freespins

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

                        maxWin = BigNumber(await DIAMONDRUSH.WIN_MAX.call());
                        bet = 1;
                        line = 5;
                        choice = 2;
                });

                it("spin sha1", async function () {

                        result = await DIAMONDRUSH.doStep([0, 0, 0, 0, 0, 0, 0], [1, 1, bet, line, 0], [], []); // Spin sha1
                        checkDoStepResult([BigNumber(maxWin).minus(bet * line), [1, 1, bet, line, 0, 0, 0]], result);

                        result = await DIAMONDRUSH.doStep([0, 0, 0, 0, 0, 5, 0], [1, 1, bet, line, 0], [], []); // Spin sha1
                        checkDoStepResult([BigNumber(maxWin).minus(bet * line), [1, 1, bet, line, 0, 0, 0]], result);
                });

                it("spin r2", async function () {

                        result = await DIAMONDRUSH.doStep(result[1], [2, 1, 0, 0, 0], [], []);
                        checkDoStepResult([BigNumber(-maxWin), [2, 1, bet, line, 0, 0, 0]], result);
                });

                it("spin r1", async function () {

                        let rand = [0, 0, 0, 0, 0, 0];
                        result = await DIAMONDRUSH.doStep(result[1], [3, 1, 0, 0, 0], rand, rand);
                        win = (await DIAMONDRUSH.getSpinResult(bet, line, rand.slice(0, rand.length - 1)))[0];
                        checkDoStepResult([BigNumber(win), [3, 0, 0, 0, 0, BigNumber(win), 0]], result);
                });

                it("doubling sha1", async function () {

                        result = await DIAMONDRUSH.doStep(result[1], [1, 2, 0, 0, choice], [], []);
                        checkDoStepResult([BigNumber(win), [1, 2, 0, 0, choice, BigNumber(win), 0]], result);
                });

                it("doubling r2", async function () {

                        result = await DIAMONDRUSH.doStep(result[1], [2, 2, 0, 0, 0], [], []);
                        checkDoStepResult([BigNumber(win).multipliedBy(-2), [2, 2, 0, 0, choice, BigNumber(win), 0]], result);
                });

                it("doubling r1", async function () {

                        let doubleWin = await DIAMONDRUSH.getDoublingResult(choice, BigNumber(win), 1);
                        result = await DIAMONDRUSH.doStep(result[1], [3, 2, 0, 0, 0], [1, 0], [0, 0]);
                        checkDoStepResult([BigNumber(doubleWin), [3, 0, 0, 0, 0, BigNumber(doubleWin), 0]], result);
                });

                it("should fail with incorrect values", async function () {

                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [0, 0, 1, 5, 0, 0], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [1, 0, 1, 5, 0], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [2, 0, 1, 5, 0], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [], []));
                        await truffleAssert.fails(DIAMONDRUSH.doStep([2, 0, 0, 0, 0, 0, 0], [0, 0, 0, 5, 0], [], []));
                });
        });

        describe("DiamondRush Checking mergeSpinRands", async function () {

                it("merges rands correctly", async function () {

                        for (var i = 0; i < 100; ++i) {
                                let r1 = [i, i + 1, i + 2, i + 3, i + 4, i + 5];
                                let r2 = [i, i, i, i, i, i];
                                let result = await DIAMONDRUSH.mergeSpinRands(r1, r2);
                                let golden = await mergeSpinRands(r1, r2);
                                checkMergeSpinRandResult(golden, result);
                        }
                });

                it("should fail merging with incorrect values", async function () {

                        await truffleAssert.fails(DIAMONDRUSH.mergeSpinRands([0, 0, 0, 0, 0], [0, 0, 0, 0, 0]));
                        await truffleAssert.fails(DIAMONDRUSH.mergeSpinRands([0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]));
                });
        });

        describe("DiamondRush Checking mergeDoublingRands", async function () {

                it("merges rands correctly", async function () {

                        let result = await DIAMONDRUSH.mergeDoublingRands([0, 0], [0, 0]);
                        assert.equal(0, BigNumber(result).toNumber());

                        result = await DIAMONDRUSH.mergeDoublingRands([0, 0], [1, 0]);
                        assert.equal(1, BigNumber(result).toNumber());

                        result = await DIAMONDRUSH.mergeDoublingRands([1, 0], [0, 0]);
                        assert.equal(1, BigNumber(result).toNumber());

                        result = await DIAMONDRUSH.mergeDoublingRands([1, 0], [1, 0]);
                        assert.equal(0, BigNumber(result).toNumber());
                });

                it("should fail merging with incorrect values", async function () {

                        await truffleAssert.fails(DIAMONDRUSH.mergeDoublingRands([0], [0]));
                        await truffleAssert.fails(DIAMONDRUSH.mergeDoublingRands([0, 0, 0], [0, 0, 0]));
                });
        });
});
