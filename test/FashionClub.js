
const FashionClub = artifacts.require("FashionClub");

const Web3 = require('web3');
const fs = require('fs');
const util = require('util');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js')


contract('FashionClub', async (accounts) => {

        let FASHIONCLUB;
        let OWNER = accounts[0];
        let SLOT = JSON.parse(fs.readFileSync('./slots/FashionClub.json'));
        let NUMBER_OF_FREESPINS = 0;
        let BET = 0;
        let LINE = 0;


        async function addLines() {

                for (var i = 0; i < SLOT.lines.length; ++i) {
                        await FASHIONCLUB.addLine(SLOT.lines[i], { from: OWNER });
                }
        }

        async function addWins() {

                for (var i = 0; i < SLOT.wins.length; ++i) {
                        await FASHIONCLUB.addWin(SLOT.wins[i], { from: OWNER });
                }
        }

        async function addReels() {

                for (var i = 0; i < SLOT.reels.length; ++i) {
                        await FASHIONCLUB.addReel(SLOT.reels[i], { from: OWNER });
                }
        }

        async function addReelsFreespin() {

                for (var i = 0; i < SLOT.reelsFreespin.length; ++i) {
                        await FASHIONCLUB.addFreespinReel(SLOT.reelsFreespin[i], { from: OWNER });
                }
        }

        async function spin(bet, line, win, freespin, rand, cards, number) {

                try {
                        let result;
                        if (0 === NUMBER_OF_FREESPINS) {
                                console.log((number + 1).toString()
                                                + " spin(" + bet.toString() + ", "
                                                + line.toString() + ", ["
                                                + rand.join() + "]) = "
                                                + win.toString() + ", "
                                                + freespin.toString());
                                result = await FASHIONCLUB.getSpinResult(bet.toString(), line, rand, NUMBER_OF_FREESPINS);
                                BET = bet;
                                LINE = line;
                        } else {
                                console.log((number + 1).toString()
                                                + " spin(" + BET.toString() + ", "
                                                + LINE.toString() + ", ["
                                                + rand.join() + "]) = "
                                                + win.toString() + ", "
                                                + freespin.toString());
                                result = await FASHIONCLUB.getSpinResult(BET.toString(), LINE, rand, NUMBER_OF_FREESPINS);
                        }
                        if (0 < NUMBER_OF_FREESPINS) {
                                console.log((await FASHIONCLUB.getFreespinImageLine(rand, 0)).toString());
                                console.log((await FASHIONCLUB.getFreespinImageLine(rand, 1)).toString());
                                console.log((await FASHIONCLUB.getFreespinImageLine(rand, 2)).toString());
                                console.log((await FASHIONCLUB.getFreespinImageLine(rand, 3)).toString());
                                console.log((await FASHIONCLUB.getFreespinImageLine(rand, 4)).toString());
                        } else {
                                console.log((await FASHIONCLUB.getImageLine(rand, 0)).toString());
                                console.log((await FASHIONCLUB.getImageLine(rand, 1)).toString());
                                console.log((await FASHIONCLUB.getImageLine(rand, 2)).toString());
                                console.log((await FASHIONCLUB.getImageLine(rand, 3)).toString());
                                console.log((await FASHIONCLUB.getImageLine(rand, 4)).toString());
                        }
                        assert.equal(win, Number(result[0]));
                        assert.equal(freespin, Number(result[1]));
                        NUMBER_OF_FREESPINS = Number(result[1]);
                        //console.log('gas cost -', await FASHIONCLUB.getSpinResult.estimateGas(bet, line, rand, NUMBER_OF_FREESPINS));
                } catch (err) {
                        throw new Error(JSON.stringify({error: err,
                                                number: number,
                                                cards: cards,
                                                spin: { bet: bet, line: line, rand: rand } }));
                }
        };

        before(async() => {

                FASHIONCLUB = await FashionClub.new({ from: OWNER });
                await addReels();
                await addReelsFreespin();
                await addWins();
                await addLines();
        });

        describe("FashionClub initial parameters", async function () {

                it("FashionClub - REELSCOUNT, REELS_FREESPIN, WINSCOUNT, LINESCOUNT, wildCard, bonusSymbol", async function () {

                        assert.equal((await FASHIONCLUB.REELS_FS_COUNT.call()).toNumber(), 5);
                        assert.equal((await FASHIONCLUB.REELS_COUNT.call()).toNumber(), 5);
                        assert.equal((await FASHIONCLUB.WINS_COUNT.call()).toNumber(), 12);
                        assert.equal((await FASHIONCLUB.LINES_COUNT.call()).toNumber(), 10);
                        assert.equal((await FASHIONCLUB.wildCard.call()).toNumber(), 1);
                        assert.equal((await FASHIONCLUB.bonusSymbol.call()).toNumber(), 12);
                        assert.equal((await FASHIONCLUB.imageSize.call()).toNumber(), 3);
                });
        });

        describe("FashionClub result of 1000 spins", async function () {

                it("1000 spins", async function () {

                        let data = JSON.parse(fs.readFileSync('test/out/FashionClub.out'));
                        for (var i = 0; i < data.length; ++i) {
                                data[i].reelStops.push(0);
                                await spin(1, data[i].linesCount,
                                                data[i].win,
                                                data[i].freespin,
                                                data[i].reelStops,
                                                data[i].cards,
                                                i);
                        }
                });
        });
});
